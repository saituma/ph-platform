import { count, eq } from "drizzle-orm";
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
    } catch {
      // unique constraint violated — retry with a new code
    }
  }
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
