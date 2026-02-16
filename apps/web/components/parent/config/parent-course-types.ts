export const PARENT_COURSE_CATEGORIES = [
  "Growth and maturation",
  "Injury prevention",
  "Sleep and recovery",
  "Nutrition for young athletes",
  "Training load management",
  "Mindset and confidence",
];

export const PARENT_MODULE_TYPES = ["article", "video", "pdf", "faq"] as const;

export const PARENT_TIER_OPTIONS = [
  { value: "", label: "All tiers" },
  { value: "PHP", label: "PHP Program" },
  { value: "PHP_Plus", label: "PHP Plus" },
  { value: "PHP_Premium", label: "PHP Premium" },
];

export type ModuleType = (typeof PARENT_MODULE_TYPES)[number];

export type ParentCourseModule = {
  id: string;
  title: string;
  type: ModuleType;
  content?: string;
  mediaUrl?: string;
  order: number;
  preview?: boolean;
};

export type ParentCourse = {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  coverImage?: string | null;
  category: string;
  programTier?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  modules: ParentCourseModule[];
};

export const createModuleId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `mod-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const normalizeModules = (modules: ParentCourseModule[]) =>
  modules
    .map((module, index) => ({
      ...module,
      order: Number.isFinite(module.order) ? module.order : index,
    }))
    .sort((a, b) => a.order - b.order);
