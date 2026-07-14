import { apiRequest } from "@/lib/api";

export type ParentCourseModule = {
  id: string;
  title: string;
  type: "article" | "video" | "pdf" | "faq";
  content?: string | null;
  mediaUrl?: string | null;
  order?: number;
};

export type ParentCourse = {
  id: number;
  title: string;
  summary: string | null;
  description?: string | null;
  coverImage: string | null;
  category: string | null;
  programTier: string | null;
  isPreview?: boolean;
  modules?: ParentCourseModule[];
};

export async function fetchParentCourses(token: string) {
  return apiRequest<{ items: ParentCourse[] }>("/content/parent-courses", {
    token,
    suppressLog: true,
  });
}

export async function fetchParentCourse(token: string, courseId: number) {
  return apiRequest<{ item: ParentCourse | null }>(
    `/content/parent-courses/${encodeURIComponent(String(courseId))}`,
    { token, suppressLog: true },
  );
}
