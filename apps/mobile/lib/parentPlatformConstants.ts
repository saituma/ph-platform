export type ParentCourseModule = {
  id: string;
  title: string;
  type: "article" | "video" | "pdf" | "faq";
  content?: string;
  mediaUrl?: string;
  order: number;
  preview?: boolean;
};

export type ParentCourseItem = {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category?: string | null;
  programTier?: string | null;
  modules: ParentCourseModule[];
  isPreview?: boolean;
};

export const PARENT_CATEGORIES = [
  { id: "growth", title: "Growth and maturation", icon: "book-open" },
  { id: "injury", title: "Injury prevention", icon: "shield" },
  { id: "sleep", title: "Sleep and recovery", icon: "battery-charging" },
  { id: "nutrition", title: "Nutrition for young athletes", icon: "coffee" },
  { id: "load", title: "Training load management", icon: "activity" },
  { id: "mindset", title: "Mindset and confidence", icon: "heart" },
];
