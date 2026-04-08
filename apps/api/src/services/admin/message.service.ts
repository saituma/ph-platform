import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTable,
  guardianTable,
  messageTable,
  userTable,
} from "../../db/schema";
import { getAdminCoachIds, sendMessage } from "../message.service";
import { attachDirectMessageReactions } from "../reaction.service";

function asSafeLimit(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

function joinNumbers(values: number[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

export async function listMessageThreadsAdmin(
  coachId: number,
  options?: { q?: string; limit?: number },
) {
  const q = options?.q?.trim().toLowerCase() ?? "";
  const limit = asSafeLimit(options?.limit, 50);
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return [];
  if (!adminIds.includes(coachId)) return [];
  const adminSet = new Set(adminIds);

  const athleteRows = await db
    .select({
      athleteUserId: athleteTable.userId,
      guardianUserId: guardianTable.userId,
    })
    .from(athleteTable)
    .leftJoin(guardianTable, eq(guardianTable.id, athleteTable.guardianId));

  const athleteToGuardian = new Map<number, number>();
  for (const row of athleteRows) {
    if (row.athleteUserId && row.guardianUserId) {
      athleteToGuardian.set(row.athleteUserId, row.guardianUserId);
    }
  }

  const adminIdList = joinNumbers(adminIds);
  const rawThreadStatsResult = await db.execute(sql`
    select
      t.other_id as "rawOtherId",
      max(t.created_at) as "latestAt",
      sum(t.unread) as "unread"
    from (
      select
        ${messageTable.receiverId} as other_id,
        ${messageTable.createdAt} as created_at,
        0::int as unread
      from ${messageTable}
      where
        ${messageTable.senderId} in (${adminIdList})
        and ${messageTable.receiverId} not in (${adminIdList})
      union all
      select
        ${messageTable.senderId} as other_id,
        ${messageTable.createdAt} as created_at,
        case when ${messageTable.read} = false then 1 else 0 end as unread
      from ${messageTable}
      where
        ${messageTable.receiverId} in (${adminIdList})
        and ${messageTable.senderId} not in (${adminIdList})
    ) t
    group by t.other_id
    order by max(t.created_at) desc
    limit ${limit * 8}
  `);
  const rawThreadStats = rawThreadStatsResult.rows as Array<{
    rawOtherId: number | string;
    latestAt: Date | string;
    unread: number | string | null;
  }>;

  const rawOtherUserIds = rawThreadStats.map((row) => Number(row.rawOtherId)).filter((id) => Number.isFinite(id));
  if (!rawOtherUserIds.length) return [];

  const latestMessageCandidates = await db
    .select({
      senderId: messageTable.senderId,
      receiverId: messageTable.receiverId,
      content: messageTable.content,
      createdAt: messageTable.createdAt,
    })
    .from(messageTable)
    .where(
      or(
        and(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, rawOtherUserIds)),
        and(inArray(messageTable.senderId, rawOtherUserIds), inArray(messageTable.receiverId, adminIds)),
      ),
    )
    .orderBy(desc(messageTable.createdAt))
    .limit(Math.max(limit * 20, 200));

  const latestByRawUserId = new Map<number, { content: string; createdAt: Date | string }>();
  for (const row of latestMessageCandidates) {
    const rawOtherId = adminSet.has(row.senderId) ? row.receiverId : row.senderId;
    if (!latestByRawUserId.has(rawOtherId)) {
      latestByRawUserId.set(rawOtherId, {
        content: row.content,
        createdAt: row.createdAt,
      });
    }
  }

  const threads = new Map<number, { latestAt: Date | string; preview: string; unread: number }>();
  for (const stat of rawThreadStats) {
    const rawOtherId = Number(stat.rawOtherId);
    if (!Number.isFinite(rawOtherId)) continue;
    const otherId = athleteToGuardian.get(rawOtherId) ?? rawOtherId;
    const latest = latestByRawUserId.get(rawOtherId);
    const preview = latest?.content ?? "Start the conversation";
    const latestAt = latest?.createdAt ?? stat.latestAt;
    const unread = Number(stat.unread ?? 0);
    const current = threads.get(otherId);
    if (!current) {
      threads.set(otherId, { latestAt, preview, unread });
      continue;
    }
    current.unread += unread;
    if (new Date(latestAt).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = latestAt;
      current.preview = preview;
    }
  }

  const userIds = Array.from(threads.keys()).sort((a, b) => {
    const timeA = new Date(threads.get(a)!.latestAt).getTime();
    const timeB = new Date(threads.get(b)!.latestAt).getTime();
    return timeB - timeA;
  });
  
  const users = userIds.length
    ? await db.select().from(userTable).where(inArray(userTable.id, userIds))
    : [];

  const guardianNameByAthleteUserId = new Map<number, string>();
  if (userIds.length) {
    const athleteRows = await db
      .select({
        athleteUserId: athleteTable.userId,
        guardianId: athleteTable.guardianId,
      })
      .from(athleteTable)
      .where(inArray(athleteTable.userId, userIds));

    const guardianIds = Array.from(new Set(athleteRows.map((row) => row.guardianId).filter((id): id is number => id != null)));
    if (guardianIds.length) {
      const guardianRows = await db
        .select({
          guardianId: guardianTable.id,
          guardianUserId: guardianTable.userId,
          guardianName: userTable.name,
          guardianEmail: userTable.email,
        })
        .from(guardianTable)
        .leftJoin(userTable, eq(guardianTable.userId, userTable.id))
        .where(inArray(guardianTable.id, guardianIds));

      const guardianNameById = new Map<number, string>();
      for (const row of guardianRows) {
        guardianNameById.set(
          row.guardianId,
          row.guardianName ?? row.guardianEmail ?? "Guardian"
        );
      }

      for (const row of athleteRows) {
        if (!row.guardianId) continue;
        const guardianName = guardianNameById.get(row.guardianId);
        if (guardianName) {
          guardianNameByAthleteUserId.set(row.athleteUserId, guardianName);
        }
      }
    }
  }

  const tierMap = new Map<number, string | null>();
  if (userIds.length) {
    const athleteRows = await db
      .select({
        userId: userTable.id,
        programTier: sql`${athleteTable.currentProgramTier}::text`.as("programTier"),
      })
      .from(userTable)
      .leftJoin(athleteTable, eq(athleteTable.userId, userTable.id))
      .where(inArray(userTable.id, userIds));

    const guardianRows = await db
      .select({
        userId: userTable.id,
        guardianTier: sql`${athleteTable.currentProgramTier}::text`.as("guardianTier"),
      })
      .from(userTable)
      .leftJoin(guardianTable, eq(guardianTable.userId, userTable.id))
      .leftJoin(athleteTable, eq(athleteTable.guardianId, guardianTable.id))
      .where(inArray(userTable.id, userIds));

    for (const row of guardianRows) {
      if (row.guardianTier) {
        tierMap.set(row.userId, row.guardianTier as string);
      }
    }
    for (const row of athleteRows) {
      if (row.programTier) {
        tierMap.set(row.userId, row.programTier as string);
      }
    }
  }

  const mapped = userIds.map((id) => {
    const info = threads.get(id)!;
    const user = users.find((u) => u.id === id);
    const guardianName = guardianNameByAthleteUserId.get(id);
    const programTier = tierMap.get(id) ?? null;
    return {
      userId: id,
      name: guardianName ?? user?.name ?? user?.email ?? "Unknown",
      preview: info.preview,
      time: info.latestAt,
      unread: info.unread,
      programTier,
      premium: programTier === "PHP_Premium",
    };
  });

  const filtered = q
    ? mapped.filter((item) =>
        [item.name, item.preview, item.programTier, item.userId]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(q)),
      )
    : mapped;
  return filtered.slice(0, limit);
}

export async function listThreadMessagesAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return [];
  if (!adminIds.includes(coachId)) return [];
  const [guardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  let otherUserIds: number[] = [userId];
  if (guardian?.id) {
    const athleteRows = await db
      .select({ userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.guardianId, guardian.id));
    const athleteUserIds = athleteRows.map((row) => row.userId);
    otherUserIds = Array.from(new Set([userId, ...athleteUserIds]));
  }

  const messages = await db
    .select()
    .from(messageTable)
    .where(
      or(
        and(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, otherUserIds)),
        and(inArray(messageTable.senderId, otherUserIds), inArray(messageTable.receiverId, adminIds))
      )
    )
    .orderBy(messageTable.createdAt);
  return attachDirectMessageReactions(messages);
}

export async function deleteThreadMessagesAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return 0;
  if (!adminIds.includes(coachId)) return 0;

  const [guardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  let otherUserIds: number[] = [userId];
  if (guardian?.id) {
    const athleteRows = await db
      .select({ userId: athleteTable.userId })
      .from(athleteTable)
      .where(eq(athleteTable.guardianId, guardian.id));
    const athleteUserIds = athleteRows.map((row) => row.userId);
    otherUserIds = Array.from(new Set([userId, ...athleteUserIds]));
  }

  const result = await db
    .delete(messageTable)
    .where(
      or(
        and(inArray(messageTable.senderId, adminIds), inArray(messageTable.receiverId, otherUserIds)),
        and(inArray(messageTable.senderId, otherUserIds), inArray(messageTable.receiverId, adminIds))
      )
    );
  return result.rowCount ?? 0;
}

const resolveGuardianThreadUsers = async (userId: number) => {
  const [guardian] = await db
    .select({ id: guardianTable.id })
    .from(guardianTable)
    .where(eq(guardianTable.userId, userId))
    .limit(1);

  if (!guardian?.id) {
    return [userId];
  }

  const athleteRows = await db
    .select({ userId: athleteTable.userId })
    .from(athleteTable)
    .where(eq(athleteTable.guardianId, guardian.id));
  const athleteUserIds = athleteRows.map((row) => row.userId);
  return Array.from(new Set([userId, ...athleteUserIds]));
};

export async function markThreadReadAdmin(coachId: number, userId: number) {
  const adminIds = await getAdminCoachIds();
  if (!adminIds.length) return 0;
  if (!adminIds.includes(coachId)) return 0;

  const otherUserIds = await resolveGuardianThreadUsers(userId);
  const result = await db
    .update(messageTable)
    .set({ read: true })
    .where(
      and(inArray(messageTable.receiverId, adminIds), inArray(messageTable.senderId, otherUserIds), eq(messageTable.read, false))
    );

  return result.rowCount ?? 0;
}

export async function sendMessageAdmin(input: {
  coachId: number;
  userId: number;
  content: string;
  contentType?: "text" | "image" | "video";
  mediaUrl?: string;
  videoUploadId?: number;
  replyToMessageId?: number;
  replyPreview?: string;
}) {
  return sendMessage({
    senderId: input.coachId,
    receiverId: input.userId,
    content: input.content,
    contentType: input.contentType ?? "text",
    mediaUrl: input.mediaUrl,
    videoUploadId: input.videoUploadId,
    replyToMessageId: input.replyToMessageId,
    replyPreview: input.replyPreview,
  });
}
