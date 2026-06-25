import { apiRequest } from "@/lib/api";

export type NewsItem = {
  id: number;
  title: string;
  content: string;
  body: string | null;
  type: string | null;
  category: string | null;
  authorName: string | null;
  date: string;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
};

export type NewsCommentItem = {
  commentId: number;
  contentId: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  canDelete: boolean;
};

export async function fetchNewsFeed(
  token: string,
  opts?: { limit?: number; cursor?: number | null; query?: string; category?: string | null },
) {
  const params = new URLSearchParams();
  params.set("limit", String(opts?.limit ?? 20));
  if (opts?.cursor != null) params.set("cursor", String(opts.cursor));
  if (opts?.query?.trim()) params.set("query", opts.query.trim());
  if (opts?.category?.trim()) params.set("category", opts.category.trim());
  return apiRequest<{ items: NewsItem[]; nextCursor: number | null }>(
    `/content/news?${params.toString()}`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function fetchNewsCategories(token: string) {
  return apiRequest<{ items: string[] }>("/content/news/categories", {
    token,
    suppressLog: true,
    skipCache: true,
    forceRefresh: true,
  });
}

export async function likeNewsItem(token: string, contentId: number) {
  return apiRequest<{ ok: true }>(`/content/news/${encodeURIComponent(String(contentId))}/like`, {
    token,
    method: "POST",
    suppressLog: true,
  });
}

export async function unlikeNewsItem(token: string, contentId: number) {
  return apiRequest<{ ok: true }>(`/content/news/${encodeURIComponent(String(contentId))}/like`, {
    token,
    method: "DELETE",
    suppressLog: true,
  });
}

export async function fetchNewsComments(token: string, contentId: number) {
  return apiRequest<{ items: NewsCommentItem[] }>(
    `/content/news/${encodeURIComponent(String(contentId))}/comments`,
    { token, suppressLog: true, skipCache: true, forceRefresh: true },
  );
}

export async function postNewsComment(token: string, contentId: number, content: string) {
  return apiRequest<{ item: NewsCommentItem }>(
    `/content/news/${encodeURIComponent(String(contentId))}/comments`,
    {
      token,
      method: "POST",
      body: { content },
      suppressLog: true,
    },
  );
}

export async function deleteNewsComment(token: string, commentId: number) {
  return apiRequest<{ ok: true }>(
    `/content/news/comments/${encodeURIComponent(String(commentId))}`,
    { token, method: "DELETE", suppressLog: true, suppressStatusCodes: [404] },
  );
}

export async function createNewsPost(
  token: string,
  payload: { title: string; content: string; body?: string; category?: string; type?: string },
) {
  return apiRequest<{ item: any }>(
    "/content",
    { token, method: "POST", body: { ...payload, surface: "news" }, suppressLog: true },
  );
}

export async function updateNewsPost(
  token: string,
  contentId: number,
  payload: { title: string; content: string; body?: string; category?: string; type?: string },
) {
  return apiRequest<{ item: any }>(
    `/content/${encodeURIComponent(String(contentId))}`,
    { token, method: "PUT", body: { ...payload, surface: "news" }, suppressLog: true },
  );
}

export async function deleteNewsPost(token: string, contentId: number) {
  return apiRequest<{ deleted: boolean }>(
    `/content/${encodeURIComponent(String(contentId))}`,
    { token, method: "DELETE", suppressLog: true, suppressStatusCodes: [404] },
  );
}
