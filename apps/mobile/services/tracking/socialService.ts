import { apiRequest } from "@/lib/api";

export type SocialLeaderboardItem = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  kmTotal: number;
  durationMinutesTotal: number;
  rank: number;
};

export type SocialRunFeedItem = {
  runLogId: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPace: number | null;
  commentCount: number;
};

export type SocialCommentItem = {
  commentId: number;
  runLogId: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  content: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  canDelete: boolean;
  reactionCounts: Record<string, number>;
  myReaction: string | null;
};

export type SocialCommentReactionUser = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  emoji: string;
};

export type SocialSort =
  | "date_desc"
  | "date_asc"
  | "distance_desc"
  | "distance_asc"
  | "duration_desc"
  | "duration_asc"
  | "comments_desc";

export async function fetchLeaderboard(
  token: string,
  opts?: {
    windowDays?: number;
    limit?: number;
    sort?: "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc";
  },
) {
  const windowDays = opts?.windowDays ?? 7;
  const limit = opts?.limit ?? 50;
  const sort = opts?.sort ?? "distance_desc";
  return apiRequest<{ items: SocialLeaderboardItem[] }>(
    `/social/leaderboard?windowDays=${encodeURIComponent(
      String(windowDays),
    )}&limit=${encodeURIComponent(String(limit))}&sort=${encodeURIComponent(sort)}`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function fetchAdultDirectory(
  token: string,
  opts?: { limit?: number; cursor?: number | null },
) {
  const limit = opts?.limit ?? 50;
  const cursor = opts?.cursor ?? null;
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }`;
  return apiRequest<{
    items: { userId: number; name: string; avatarUrl: string | null }[];
    nextCursor: number | null;
  }>(`/social/adults?${q}`, {
    token,
    suppressLog: true,
    skipCache: true,
    forceRefresh: true,
  });
}

export async function fetchRunFeed(
  token: string,
  opts?: {
    limit?: number;
    cursor?: number | null;
    windowDays?: number;
    sort?: SocialSort;
  },
) {
  const limit = opts?.limit ?? 20;
  const cursor = opts?.cursor ?? null;
  const windowDays = opts?.windowDays ?? 0;
  const sort = opts?.sort ?? "date_desc";
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }&windowDays=${encodeURIComponent(String(windowDays))}&sort=${encodeURIComponent(sort)}`;
  return apiRequest<{ items: SocialRunFeedItem[]; nextCursor: number | null }>(
    `/social/runs?${q}`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function fetchRunComments(token: string, runLogId: number) {
  return apiRequest<{ items: SocialCommentItem[] }>(
    `/social/runs/${encodeURIComponent(String(runLogId))}/comments`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function postRunComment(
  token: string,
  runLogId: number,
  content: string,
  opts?: { parentId?: number | null },
) {
  return apiRequest<{ item: SocialCommentItem }>(
    `/social/runs/${encodeURIComponent(String(runLogId))}/comments`,
    {
      token,
      method: "POST",
      body: { content, ...(opts?.parentId != null ? { parentId: opts.parentId } : {}) },
      suppressLog: true,
    },
  );
}

export async function editComment(token: string, commentId: number, content: string) {
  return apiRequest<{ item: SocialCommentItem }>(
    `/social/comments/${encodeURIComponent(String(commentId))}`,
    { token, method: "PATCH", body: { content }, suppressLog: true },
  );
}

export async function deleteComment(token: string, commentId: number) {
  return apiRequest<{ ok: true }>(
    `/social/comments/${encodeURIComponent(String(commentId))}`,
    { token, method: "DELETE", suppressLog: true, suppressStatusCodes: [404] },
  );
}

export async function reportComment(
  token: string,
  commentId: number,
  reason?: string,
) {
  return apiRequest<{ ok: true }>(
    `/social/comments/${encodeURIComponent(String(commentId))}/report`,
    {
      token,
      method: "POST",
      body: reason ? { reason } : {},
      suppressLog: true,
      suppressStatusCodes: [400],
    },
  );
}

export async function listCommentReactions(token: string, commentId: number) {
  return apiRequest<{ items: SocialCommentReactionUser[] }>(
    `/social/comments/${encodeURIComponent(String(commentId))}/reactions`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function setCommentReaction(token: string, commentId: number, emoji: string) {
  return apiRequest<{ ok: true }>(
    `/social/comments/${encodeURIComponent(String(commentId))}/reaction`,
    { token, method: "POST", body: { emoji }, suppressLog: true },
  );
}

export async function clearCommentReaction(token: string, commentId: number) {
  return apiRequest<{ ok: true }>(
    `/social/comments/${encodeURIComponent(String(commentId))}/reaction`,
    { token, method: "DELETE", suppressLog: true },
  );
}
