import { count, eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { db } from "../db";
import { referralClaimsTable, userReferralCodesTable, userTable } from "../db/schema";

function generateCode(name: string): string {
  const prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix || "REF"}-${suffix}`;
}

export async function getOrCreateReferralCode(userId: number): Promise<string> {
  const existing = await db
    .select({ code: userReferralCodesTable.code })
    .from(userReferralCodesTable)
    .where(eq(userReferralCodesTable.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0].code;

  const userRow = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const baseName = userRow[0]?.name ?? "USER";

  // Retry until unique (collision extremely unlikely but handle gracefully)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(baseName);
    try {
      await db.insert(userReferralCodesTable).values({ userId, code });
      return code;
    } catch (err: unknown) {
      // Only retry on unique constraint violations (code collision or race on userId).
      // Re-throw anything else (connection errors, missing table, etc.).
      const isConstraintViolation =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505";
      if (!isConstraintViolation) throw err;
    }
  }

  // If we exhausted retries, a concurrent request may have created the code for this user.
  // Re-query before giving up.
  const raceCheck = await db
    .select({ code: userReferralCodesTable.code })
    .from(userReferralCodesTable)
    .where(eq(userReferralCodesTable.userId, userId))
    .limit(1);
  if (raceCheck[0]) return raceCheck[0].code;

  throw new Error("Failed to generate a unique referral code");
}

export async function getReferralStats(userId: number) {
  const codeRow = await db
    .select({ id: userReferralCodesTable.id, code: userReferralCodesTable.code })
    .from(userReferralCodesTable)
    .where(eq(userReferralCodesTable.userId, userId))
    .limit(1);

  if (!codeRow[0]) return { code: null, total: 0, referrals: [] };

  const [referrals, totalRows] = await Promise.all([
    db
      .select({
        id: referralClaimsTable.id,
        claimedAt: referralClaimsTable.claimedAt,
        newUserName: userTable.name,
      })
      .from(referralClaimsTable)
      .leftJoin(userTable, eq(referralClaimsTable.newUserId, userTable.id))
      .where(eq(referralClaimsTable.referralCodeId, codeRow[0].id))
      .orderBy(referralClaimsTable.claimedAt),

    db
      .select({ count: count() })
      .from(referralClaimsTable)
      .where(eq(referralClaimsTable.referralCodeId, codeRow[0].id)),
  ]);

  return {
    code: codeRow[0].code,
    total: totalRows[0]?.count ?? 0,
    referrals: referrals.map((r) => ({
      id: r.id,
      claimedAt: r.claimedAt.toISOString(),
      // obfuscate name — show first name + first letter of last
      displayName: obfuscateName(r.newUserName),
    })),
  };
}

export async function claimReferralCode(code: string, newUserId: number): Promise<void> {
  const codeRow = await db
    .select({ id: userReferralCodesTable.id, userId: userReferralCodesTable.userId })
    .from(userReferralCodesTable)
    .where(eq(userReferralCodesTable.code, code.toUpperCase()))
    .limit(1);

  if (!codeRow[0]) return; // invalid code — silently ignore
  if (codeRow[0].userId === newUserId) return; // can't refer yourself

  try {
    await db.insert(referralClaimsTable).values({
      referralCodeId: codeRow[0].id,
      newUserId,
    });
  } catch {
    // already claimed — ignore duplicate
  }
}

function obfuscateName(name: string | null | undefined): string {
  if (!name) return "Anonymous";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 1) + "***";
  return `${parts[0]} ${parts[parts.length - 1]!.slice(0, 1)}.`;
}

export async function getAdminReferralOverview() {
  // All users who have a referral code, with their claim counts
  const rows = await db
    .select({
      referrerId: userReferralCodesTable.userId,
      referrerName: userTable.name,
      referrerEmail: userTable.email,
      referrerRole: userTable.role,
      code: userReferralCodesTable.code,
      codeCreatedAt: userReferralCodesTable.createdAt,
      claimId: referralClaimsTable.id,
      claimedAt: referralClaimsTable.claimedAt,
      newUserId: referralClaimsTable.newUserId,
    })
    .from(userReferralCodesTable)
    .innerJoin(userTable, eq(userReferralCodesTable.userId, userTable.id))
    .leftJoin(referralClaimsTable, eq(referralClaimsTable.referralCodeId, userReferralCodesTable.id))
    .orderBy(userReferralCodesTable.userId, referralClaimsTable.claimedAt);

  // Fetch joinee names in one query
  const newUserIds = [...new Set(rows.map((r) => r.newUserId).filter((id): id is number => id != null))];
  const joineeRows = newUserIds.length
    ? await db
        .select({ id: userTable.id, name: userTable.name, email: userTable.email })
        .from(userTable)
        .where(inArray(userTable.id, newUserIds))
    : [];
  const joineeMap = new Map(joineeRows.map((j) => [j.id, j]));

  // Group by referrer
  const byReferrer = new Map<number, {
    referrerId: number;
    referrerName: string | null;
    referrerEmail: string | null;
    referrerRole: string | null;
    code: string;
    codeCreatedAt: Date;
    claims: Array<{ id: number; claimedAt: Date; joineeName: string | null; joineeEmail: string | null; joineeId: number }>;
  }>();

  for (const row of rows) {
    if (!byReferrer.has(row.referrerId)) {
      byReferrer.set(row.referrerId, {
        referrerId: row.referrerId,
        referrerName: row.referrerName,
        referrerEmail: row.referrerEmail,
        referrerRole: row.referrerRole,
        code: row.code,
        codeCreatedAt: row.codeCreatedAt,
        claims: [],
      });
    }
    if (row.claimId != null && row.newUserId != null) {
      const joinee = joineeMap.get(row.newUserId);
      byReferrer.get(row.referrerId)!.claims.push({
        id: row.claimId,
        claimedAt: row.claimedAt!,
        joineeName: joinee?.name ?? null,
        joineeEmail: joinee?.email ?? null,
        joineeId: row.newUserId,
      });
    }
  }

  const referrers = [...byReferrer.values()]
    .sort((a, b) => b.claims.length - a.claims.length)
    .map((r) => ({
      ...r,
      codeCreatedAt: r.codeCreatedAt.toISOString(),
      totalReferred: r.claims.length,
      claims: r.claims.map((c) => ({ ...c, claimedAt: c.claimedAt.toISOString() })),
    }));

  const totalCodes = referrers.length;
  const totalClaims = referrers.reduce((s, r) => s + r.totalReferred, 0);

  return { totalCodes, totalClaims, referrers };
}
