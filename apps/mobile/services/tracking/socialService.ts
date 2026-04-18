import { apiRequest } from "@/lib/api";

export type SocialLeaderboardItem = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  kmTotal: number;
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
  createdAt: string;
};

export async function fetchLeaderboard(
  token: string,
  opts?: { windowDays?: number; limit?: number },
) {
  const windowDays = opts?.windowDays ?? 7;
  const limit = opts?.limit ?? 50;
  return apiRequest<{ items: SocialLeaderboardItem[] }>(
    `/social/leaderboard?windowDays=${encodeURIComponent(
      String(windowDays),
    )}&limit=${encodeURIComponent(String(limit))}`,
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
  opts?: { limit?: number; cursor?: number | null },
) {
  const limit = opts?.limit ?? 20;
  const cursor = opts?.cursor ?? null;
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }`;
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
) {
  return apiRequest<{ item: SocialCommentItem }>(
    `/social/runs/${encodeURIComponent(String(runLogId))}/comments`,
    { token, method: "POST", body: { content }, suppressLog: true },
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

