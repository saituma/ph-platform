import { and, eq, sql } from "drizzle-orm";

import { db } from "../db";
import { runLikeTable, runLogTable, socialPrivacySettingsTable, userTable } from "../db/schema";
import { SocialAccessError } from "./social.service";
import { normalizeStoredMediaUrl } from "./s3.service";

export type PrivacySettings = {
  socialEnabled: boolean;
  shareRunsPublicly: boolean;
  allowComments: boolean;
  showInLeaderboard: boolean;
  showInDirectory: boolean;
  privacyVersionAccepted: string | null;
  optedInAt: string | null;
};

export async function getPrivacySettings(userId: number): Promise<PrivacySettings> {
  const rows = await db
    .select()
    .from(socialPrivacySettingsTable)
    .where(eq(socialPrivacySettingsTable.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    // Return defaults - social disabled by default
    return {
      socialEnabled: false,
      shareRunsPublicly: false,
      allowComments: true,
      showInLeaderboard: true,
      showInDirectory: true,
      privacyVersionAccepted: null,
      optedInAt: null,
    };
  }

  const s = rows[0]!;
  return {
    socialEnabled: s.socialEnabled,
    shareRunsPublicly: s.shareRunsPublicly,
    allowComments: s.allowComments,
    showInLeaderboard: s.showInLeaderboard,
    showInDirectory: s.showInDirectory,
    privacyVersionAccepted: s.privacyVersionAccepted ?? null,
    optedInAt: s.optedInAt?.toISOString() ?? null,
  };
}

export async function updatePrivacySettings(
  userId: number,
  updates: Partial<PrivacySettings> & { privacyVersionAccepted?: string },
): Promise<PrivacySettings> {
  // Get or create settings
  const existing = await db
    .select({ id: socialPrivacySettingsTable.id })
    .from(socialPrivacySettingsTable)
    .where(eq(socialPrivacySettingsTable.userId, userId))
    .limit(1);

  const now = new Date();
  const values: any = {
    updatedAt: now,
  };

  // Track opt-in/opt-out timestamps for audit
  if (updates.socialEnabled === true) {
    values.socialEnabled = true;
    values.optedInAt = now;
    values.optedOutAt = null;
  } else if (updates.socialEnabled === false) {
    values.socialEnabled = false;
    values.optedOutAt = now;
    // When opting out, also disable public sharing
    values.shareRunsPublicly = false;
    values.showInLeaderboard = false;
    values.showInDirectory = false;
  }

  if (updates.shareRunsPublicly !== undefined) {
    values.shareRunsPublicly = updates.shareRunsPublicly;
  }
  if (updates.allowComments !== undefined) {
    values.allowComments = updates.allowComments;
  }
  if (updates.showInLeaderboard !== undefined) {
    values.showInLeaderboard = updates.showInLeaderboard;
  }
  if (updates.showInDirectory !== undefined) {
    values.showInDirectory = updates.showInDirectory;
  }
  if (updates.privacyVersionAccepted) {
    values.privacyVersionAccepted = updates.privacyVersionAccepted;
  }

  if (existing.length > 0) {
    await db.update(socialPrivacySettingsTable).set(values).where(eq(socialPrivacySettingsTable.userId, userId));
  } else {
    await db.insert(socialPrivacySettingsTable).values({
      userId,
      ...values,
    });
  }

  // If opting out, make all runs private and delete likes/comments
  if (updates.socialEnabled === false) {
    await handleSocialOptOut(userId);
  }

  return getPrivacySettings(userId);
}

async function handleSocialOptOut(userId: number) {
  // Make all user's public runs private
  await db
    .update(runLogTable)
    .set({ visibility: "private", updatedAt: new Date() })
    .where(and(eq(runLogTable.userId, userId), eq(runLogTable.visibility, "public")));

  // Delete all likes on user's runs
  await db.execute(sql`
    DELETE FROM "run_likes"
    WHERE "runLogId" IN (
      SELECT id FROM "run_logs" WHERE "userId" = ${userId}
    )
  `);
}

export async function assertSocialEnabled(userId: number) {
  const settings = await getPrivacySettings(userId);
  if (!settings.socialEnabled) {
    throw new SocialAccessError("FORBIDDEN", "Social features not enabled. Please opt-in in privacy settings.");
  }
  return settings;
}

export async function canViewSocialContent(viewerUserId: number): Promise<boolean> {
  const settings = await getPrivacySettings(viewerUserId);
  return settings.socialEnabled;
}

// Run Likes
export async function getRunLikes(runLogId: number) {
  const rows = await db
    .select({
      userId: runLikeTable.userId,
      name: userTable.name,
      profilePicture: userTable.profilePicture,
      createdAt: runLikeTable.createdAt,
    })
    .from(runLikeTable)
    .innerJoin(userTable, eq(userTable.id, runLikeTable.userId))
    .where(eq(runLikeTable.runLogId, runLogId))
    .orderBy(runLikeTable.createdAt);

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    avatarUrl: normalizeStoredMediaUrl(r.profilePicture ?? null),
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getRunLikeSummary(viewerUserId: number, runLogIds: number[]) {
  if (!runLogIds.length) {
    return new Map<number, { count: number; userLiked: boolean }>();
  }

  const rows = await db
    .select({
      runLogId: runLikeTable.runLogId,
      userId: runLikeTable.userId,
    })
    .from(runLikeTable)
    .where(sql`${runLikeTable.runLogId} = ANY(${runLogIds})`);

  const result = new Map<number, { count: number; userLiked: boolean }>();
  for (const row of rows) {
    const existing = result.get(row.runLogId) ?? { count: 0, userLiked: false };
    existing.count++;
    if (row.userId === viewerUserId) {
      existing.userLiked = true;
    }
    result.set(row.runLogId, existing);
  }
  return result;
}

export async function likeRun(input: { userId: number; runLogId: number }) {
  // Verify user has social enabled
  await assertSocialEnabled(input.userId);

  // Verify run is public and belongs to a user with social enabled
  const runCheck = await db
    .select({
      id: runLogTable.id,
      userId: runLogTable.userId,
      visibility: runLogTable.visibility,
    })
    .from(runLogTable)
    .where(eq(runLogTable.id, input.runLogId))
    .limit(1);

  if (!runCheck.length) {
    throw new SocialAccessError("NOT_FOUND", "Run not found");
  }

  const run = runCheck[0]!;
  if (run.visibility !== "public") {
    throw new SocialAccessError("FORBIDDEN", "Cannot like private runs");
  }

  // Check run owner has social enabled
  const ownerSettings = await getPrivacySettings(run.userId);
  if (!ownerSettings.socialEnabled) {
    throw new SocialAccessError("FORBIDDEN", "User has disabled social features");
  }

  // Insert like (will fail silently if already exists due to unique constraint)
  await db
    .insert(runLikeTable)
    .values({
      runLogId: input.runLogId,
      userId: input.userId,
    })
    .onConflictDoNothing();

  return { ok: true as const };
}

export async function unlikeRun(input: { userId: number; runLogId: number }) {
  await db
    .delete(runLikeTable)
    .where(and(eq(runLikeTable.runLogId, input.runLogId), eq(runLikeTable.userId, input.userId)));

  return { ok: true as const };
}

export async function getMySocialRuns(userId: number, opts?: { limit?: number; cursor?: number }) {
  const limit = opts?.limit ?? 20;
  const cursor = opts?.cursor;

  const settings = await getPrivacySettings(userId);
  if (!settings.socialEnabled) {
    return { items: [], nextCursor: null };
  }

  const rows = await db
    .select({
      runLogId: runLogTable.id,
      date: runLogTable.date,
      distanceMeters: runLogTable.distanceMeters,
      durationSeconds: runLogTable.durationSeconds,
      avgPace: runLogTable.avgPace,
      coordinates: runLogTable.coordinates,
      visibility: runLogTable.visibility,
    })
    .from(runLogTable)
    .where(and(eq(runLogTable.userId, userId), cursor ? sql`${runLogTable.id} < ${cursor}` : sql`true`))
    .orderBy(sql`${runLogTable.id} DESC`)
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]!.runLogId : null;

  const runIds = page.map((r) => r.runLogId);
  const likeSummaries = await getRunLikeSummary(userId, runIds);

  return {
    items: page.map((r) => {
      const likes = likeSummaries.get(r.runLogId) ?? { count: 0, userLiked: false };
      return {
        runLogId: r.runLogId,
        date: r.date.toISOString(),
        distanceMeters: r.distanceMeters,
        durationSeconds: r.durationSeconds,
        avgPace: r.avgPace ?? null,
        visibility: r.visibility,
        likeCount: likes.count,
        userLiked: likes.userLiked,
      };
    }),
    nextCursor,
  };
}
