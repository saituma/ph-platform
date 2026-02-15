type ParentCourseItem = {
  id: number;
  title?: string;
  summary?: string;
  description?: string | null;
  coverImage?: string | null;
  category?: string | null;
  programTier?: string | null;
  modules?: {
    id: string;
    title: string;
    type: "article" | "video" | "pdf" | "faq";
    content?: string;
    mediaUrl?: string;
    order: number;
    preview?: boolean;
  }[];
  isPreview?: boolean;
};

const cache = new Map<number, ParentCourseItem>();

export function setParentContentCache(item: ParentCourseItem) {
  if (!Number.isFinite(item.id)) return;
  cache.set(item.id, item);
}

export function getParentContentCache(id: number) {
  return cache.get(id) ?? null;
}
