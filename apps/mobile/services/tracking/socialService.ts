import { apiRequest } from "@/lib/api";

/** Team athletes use `/teams/social/*`; solo adults use only local tracking (no feed). */
export function socialFeedBase(useTeamFeed: boolean): "/social" | "/teams/social" {
  return useTeamFeed ? "/teams/social" : "/social";
}

function directoryPath(useTeamFeed: boolean): string {
  return useTeamFeed ? "/teams/social/directory" : "/social/adults";
}

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
  likeCount?: number;
  userLiked?: boolean;
  pathPreview: { latitude: number; longitude: number }[] | null;
};

export type SocialPostItem = {
  id: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType?: "image" | "video";
  date: string;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
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

export type SocialPostCommentItem = {
  commentId: number;
  postId: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  content: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  canDelete: boolean;
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

export type PrivacySettings = {
  socialEnabled: boolean;
  shareRunsPublicly: boolean;
  allowComments: boolean;
  showInLeaderboard: boolean;
  showInDirectory: boolean;
  privacyVersionAccepted: string | null;
  optedInAt: string | null;
};

/** Same defaults as API `getPrivacySettings` when no DB row exists. Used when GET /social/privacy is unavailable (404). */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  socialEnabled: false,
  shareRunsPublicly: false,
  allowComments: true,
  showInLeaderboard: true,
  showInDirectory: true,
  privacyVersionAccepted: null,
  optedInAt: null,
};

export type MySocialRunItem = {
  runLogId: number;
  date: string;
  distanceMeters: number;
  durationSeconds: number;
  avgPace: number | null;
  visibility: string;
  likeCount: number;
  userLiked: boolean;
};

export async function fetchLeaderboard(
  token: string,
  opts?: {
    windowDays?: number;
    limit?: number;
    sort?: "distance_desc" | "distance_asc" | "duration_desc" | "duration_asc";
    /** When true, use `/teams/social/*` (team athletes). */
    useTeamFeed?: boolean;
  },
) {
  const windowDays = opts?.windowDays ?? 7;
  const limit = opts?.limit ?? 50;
  const sort = opts?.sort ?? "distance_desc";
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ items: SocialLeaderboardItem[] }>(
    `${base}/leaderboard?windowDays=${encodeURIComponent(
      String(windowDays),
    )}&limit=${encodeURIComponent(String(limit))}&sort=${encodeURIComponent(sort)}`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function fetchAdultDirectory(
  token: string,
  opts?: { limit?: number; cursor?: number | null; useTeamFeed?: boolean },
) {
  const limit = opts?.limit ?? 50;
  const cursor = opts?.cursor ?? null;
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }`;
  return apiRequest<{
    items: { userId: number; name: string; avatarUrl: string | null }[];
    nextCursor: number | null;
  }>(`${directoryPath(Boolean(opts?.useTeamFeed))}?${q}`, {
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
    useTeamFeed?: boolean;
  },
) {
  const limit = opts?.limit ?? 20;
  const cursor = opts?.cursor ?? null;
  const windowDays = opts?.windowDays ?? 0;
  const sort = opts?.sort ?? "date_desc";
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }&windowDays=${encodeURIComponent(String(windowDays))}&sort=${encodeURIComponent(sort)}`;
  return apiRequest<{ items: SocialRunFeedItem[]; nextCursor: number | null }>(
    `${base}/runs?${q}`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function fetchPostFeed(
  token: string,
  opts?: { limit?: number; cursor?: number | null; useTeamFeed?: boolean },
) {
  const limit = opts?.limit ?? 20;
  const cursor = opts?.cursor ?? null;
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }`;
  return apiRequest<{ items: SocialPostItem[]; nextCursor: number | null }>(
    `${base}/posts?${q}`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function createSocialPost(
  token: string,
  data: { content: string; mediaUrl?: string; mediaType?: string },
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ item: SocialPostItem }>(`${base}/posts`, {
    token,
    method: "POST",
    body: data,
    suppressLog: true,
  });
}

export async function likeSocialPost(
  token: string,
  postId: number,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(`${base}/posts/${encodeURIComponent(String(postId))}/like`, {
    token,
    method: "POST",
    suppressLog: true,
  });
}

export async function unlikeSocialPost(
  token: string,
  postId: number,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(`${base}/posts/${encodeURIComponent(String(postId))}/like`, {
    token,
    method: "DELETE",
    suppressLog: true,
  });
}

export async function fetchRunDetail(token: string, runLogId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{
    item: {
      runLogId: number;
      userId: number;
      name: string;
      avatarUrl: string | null;
      date: string;
      distanceMeters: number;
      durationSeconds: number;
      avgPace: number | null;
      path: { latitude: number; longitude: number }[] | null;
    };
  }>(`${base}/runs/${encodeURIComponent(String(runLogId))}`, {
    token,
    suppressLog: true,
    skipCache: true,
    forceRefresh: true,
  });
}

export async function fetchRunComments(token: string, runLogId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ items: SocialCommentItem[] }>(
    `${base}/runs/${encodeURIComponent(String(runLogId))}/comments`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function postRunComment(
  token: string,
  runLogId: number,
  content: string,
  opts?: { parentId?: number | null; useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ item: SocialCommentItem }>(
    `${base}/runs/${encodeURIComponent(String(runLogId))}/comments`,
    {
      token,
      method: "POST",
      body: { content, ...(opts?.parentId != null ? { parentId: opts.parentId } : {}) },
      suppressLog: true,
    },
  );
}

export async function editComment(
  token: string,
  commentId: number,
  content: string,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ item: SocialCommentItem }>(
    `${base}/comments/${encodeURIComponent(String(commentId))}`,
    { token, method: "PATCH", body: { content }, suppressLog: true },
  );
}

export async function deleteComment(token: string, commentId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/comments/${encodeURIComponent(String(commentId))}`,
    { token, method: "DELETE", suppressLog: true, suppressStatusCodes: [404] },
  );
}

export async function fetchPostComments(
  token: string,
  postId: number,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ items: SocialPostCommentItem[] }>(
    `${base}/posts/${encodeURIComponent(String(postId))}/comments`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function postSocialPostComment(
  token: string,
  postId: number,
  content: string,
  opts?: { parentId?: number | null; useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ item: SocialPostCommentItem }>(
    `${base}/posts/${encodeURIComponent(String(postId))}/comments`,
    {
      token,
      method: "POST",
      body: { content, ...(opts?.parentId != null ? { parentId: opts.parentId } : {}) },
      suppressLog: true,
    },
  );
}

export async function deletePostComment(
  token: string,
  commentId: number,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/posts/comments/${encodeURIComponent(String(commentId))}`,
    { token, method: "DELETE", suppressLog: true, suppressStatusCodes: [404] },
  );
}

export async function reportComment(
  token: string,
  commentId: number,
  reason?: string,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/comments/${encodeURIComponent(String(commentId))}/report`,
    {
      token,
      method: "POST",
      body: reason ? { reason } : {},
      suppressLog: true,
      suppressStatusCodes: [400],
    },
  );
}

export async function listCommentReactions(token: string, commentId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ items: SocialCommentReactionUser[] }>(
    `${base}/comments/${encodeURIComponent(String(commentId))}/reactions`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function setCommentReaction(
  token: string,
  commentId: number,
  emoji: string,
  opts?: { useTeamFeed?: boolean },
) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/comments/${encodeURIComponent(String(commentId))}/reaction`,
    { token, method: "POST", body: { emoji }, suppressLog: true },
  );
}

export async function clearCommentReaction(token: string, commentId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/comments/${encodeURIComponent(String(commentId))}/reaction`,
    { token, method: "DELETE", suppressLog: true },
  );
}

// Privacy Settings
export async function fetchPrivacySettings(token: string) {
  try {
    return await apiRequest<{ settings: PrivacySettings }>("/social/privacy", {
      token,
      suppressLog: true,
      skipCache: true,
      forceRefresh: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Stale API deploys or proxies that omit /social/* return 404; use local defaults.
    if (/^404\s/.test(msg)) {
      return { settings: { ...DEFAULT_PRIVACY_SETTINGS } };
    }
    throw e;
  }
}

export async function updatePrivacySettings(
  token: string,
  updates: Partial<PrivacySettings>,
) {
  return apiRequest<{ settings: PrivacySettings }>("/social/privacy", {
    token,
    method: "PATCH",
    body: updates,
    suppressLog: true,
  });
}

// Run Likes
export async function likeRun(token: string, runLogId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/runs/${encodeURIComponent(String(runLogId))}/like`,
    { token, method: "POST", suppressLog: true },
  );
}

export async function unlikeRun(token: string, runLogId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{ ok: true }>(
    `${base}/runs/${encodeURIComponent(String(runLogId))}/like`,
    { token, method: "DELETE", suppressLog: true },
  );
}

export async function fetchRunLikes(token: string, runLogId: number, opts?: { useTeamFeed?: boolean }) {
  const base = socialFeedBase(Boolean(opts?.useTeamFeed));
  return apiRequest<{
    items: { userId: number; name: string; avatarUrl: string | null; createdAt: string }[];
  }>(`${base}/runs/${encodeURIComponent(String(runLogId))}/likes`, {
    token,
    suppressLog: true,
    skipCache: true,
    forceRefresh: true,
  });
}

// My Social Runs
export async function fetchMySocialRuns(
  token: string,
  opts?: { limit?: number; cursor?: number | null },
) {
  const limit = opts?.limit ?? 20;
  const cursor = opts?.cursor ?? null;
  const q = `limit=${encodeURIComponent(String(limit))}${
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : ""
  }`;
  return apiRequest<{
    items: MySocialRunItem[];
    nextCursor: number | null;
  }>(`/social/my-runs?${q}`, {
    token,
    suppressLog: true,
    skipCache: true,
    forceRefresh: true,
  });
}
