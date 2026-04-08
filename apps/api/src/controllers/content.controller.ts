import type { Request, Response } from "express";
import { z } from "zod";

import {
  createContent,
  getHomeContentForUser,
  getParentPlatformContent,
  getLegalContentForUser,
  getLegalContent,
  getAnnouncements,
  deleteContentItem,
  updateContent,
  getContentById,
  getContentByIdAdmin,
  getParentCourseById,
  listParentCourses,
  createParentCourse,
  updateParentCourse,
  getTestimonialSubmissions,
  updateContentCategory,
  getParentCourseAiInsight,
  listStoriesForUser,
  listStoriesAdmin,
  replaceStories,
} from "../services/content.service";
import { ProgramType, contentType } from "../db/schema";
import { getAthleteForUser } from "../services/user.service";

const contentCreateSchema = z.object({
  title: z.string().optional().transform((val) => val?.trim() || ""),
  content: z.string().optional().transform((val) => val?.trim() || ""),
  type: z.enum(contentType.enumValues),
  body: z.string().optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  surface: z.enum(["home", "parent_platform", "legal", "announcements", "testimonial_submissions"]),
  category: z.string().optional(),
  ageList: z.array(z.number().int().min(0)).optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  announcementAudienceType: z.enum(["all", "age", "team", "group", "athlete_type", "tier"]).optional(),
  announcementAudienceAge: z.number().int().min(0).optional(),
  announcementAudienceTeam: z.string().optional(),
  announcementAudienceGroupId: z.number().int().min(1).optional(),
  announcementAudienceAthleteType: z.enum(["youth", "adult"]).optional(),
  announcementAudienceTier: z.enum(ProgramType.enumValues).optional(),
}).superRefine((data, ctx) => {
  if (data.surface !== "announcements") {
    if (!data.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        exact: false,
        message: "Title is required.",
        path: ["title"],
      });
    }
    if (!data.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 1,
        type: "string",
        inclusive: true,
        exact: false,
        message: "Content is required.",
        path: ["content"],
      });
    }
  }
  if (data.surface === "announcements") {
    const audienceType = data.announcementAudienceType ?? "all";
    if (audienceType === "age" && data.announcementAudienceAge === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Announcement age is required for age audience.",
        path: ["announcementAudienceAge"],
      });
    }
    if (audienceType === "team" && !data.announcementAudienceTeam?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Team is required for team audience.",
        path: ["announcementAudienceTeam"],
      });
    }
    if (audienceType === "group" && data.announcementAudienceGroupId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Group is required for group audience.",
        path: ["announcementAudienceGroupId"],
      });
    }
    if (audienceType === "athlete_type" && !data.announcementAudienceAthleteType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Athlete type is required for athlete-type audience.",
        path: ["announcementAudienceAthleteType"],
      });
    }
    if (audienceType === "tier" && !data.announcementAudienceTier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tier is required for tier audience.",
        path: ["announcementAudienceTier"],
      });
    }
  }
}).refine((data) => data.minAge === undefined || data.maxAge === undefined || data.minAge <= data.maxAge, {
  message: "Minimum age must be less than or equal to maximum age.",
  path: ["minAge"],
}).refine((data) => {
  if (!data.ageList || data.ageList.length === 0) return true;
  return data.ageList.every((age) => Number.isFinite(age));
}, {
  message: "Age list must be a list of valid ages.",
  path: ["ageList"],
});

const contentUpdateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(contentType.enumValues),
  body: z.string().optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  category: z.string().optional(),
  ageList: z.array(z.number().int().min(0)).optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
}).refine((data) => data.minAge === undefined || data.maxAge === undefined || data.minAge <= data.maxAge, {
  message: "Minimum age must be less than or equal to maximum age.",
  path: ["minAge"],
}).refine((data) => {
  if (!data.ageList || data.ageList.length === 0) return true;
  return data.ageList.every((age) => Number.isFinite(age));
}, {
  message: "Age list must be a list of valid ages.",
  path: ["ageList"],
});

const parentCourseModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["article", "video", "pdf", "faq"]),
  content: z.string().optional().nullable(),
  mediaUrl: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    })
    .refine((val) => !val.startsWith("data:"), {
      message: "Use a URL instead of base64 data.",
    })
    .optional()
    .nullable(),
  order: z.number().int().min(0),
  preview: z.boolean().optional().nullable(),
});

const parentCourseCreateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().optional().nullable(),
  coverImage: z
    .string()
    .transform((val) => val?.trim() || "")
    .refine((val) => val === "" || z.string().url().safeParse(val).success, {
      message: "Invalid URL format",
    })
    .refine((val) => !val.startsWith("data:"), {
      message: "Use a URL instead of base64 data.",
    })
    .optional()
    .nullable(),
  category: z.string().min(1),
  programTier: z.enum(ProgramType.enumValues).optional().nullable(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  modules: z.array(parentCourseModuleSchema).min(1),
}).refine((data) => data.minAge === undefined || data.maxAge === undefined || data.minAge <= data.maxAge, {
  message: "Minimum age must be less than or equal to maximum age.",
  path: ["minAge"],
});

const parentCourseUpdateSchema = parentCourseCreateSchema;

const testimonialSubmissionSchema = z.object({
  name: z.string().optional(),
  quote: z.string().min(1),
  rating: z.number().int().min(1).max(5).default(5),
  photoUrl: z.string().url().optional().nullable(),
});

const storyInputSchema = z.object({
  title: z.string().min(1),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]),
  badge: z.string().optional().nullable(),
  order: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional().nullable(),
});

const storiesReplaceSchema = z.object({
  stories: z.array(storyInputSchema),
});

export async function listHomeContent(req: Request, res: Response) {
  const items = await getHomeContentForUser(req.user!.id);
  return res.status(200).json({ items });
}

export async function listParentContent(req: Request, res: Response) {
  const role = (req.user as any)?.role as string | undefined;
  const items = await getParentPlatformContent(req.user!.id, role);
  return res.status(200).json({ items });
}

export async function listLegalContent(req: Request, res: Response) {
  const items = await getLegalContentForUser();
  return res.status(200).json({ items });
}

export async function listAnnouncementsContent(_req: Request, res: Response) {
  const items = await getAnnouncements(_req.user!.id, (_req.user as { role?: string } | undefined)?.role);
  return res.status(200).json({ items });
}

export async function listStories(req: Request, res: Response) {
  const items = await listStoriesForUser();
  return res.status(200).json({ items });
}

export async function listStoriesForAdmin(_req: Request, res: Response) {
  const items = await listStoriesAdmin();
  return res.status(200).json({ items });
}

export async function replaceStoriesHandler(req: Request, res: Response) {
  const input = storiesReplaceSchema.parse(req.body);
  const items = await replaceStories(input.stories, req.user!.id);
  return res.status(200).json({ items });
}

export async function listLegalContentPublic(_req: Request, res: Response) {
  const items = await getLegalContent();
  return res.status(200).json({ items });
}

export async function getContentItem(req: Request, res: Response) {
  const contentId = z.coerce.number().int().min(1).parse(req.params.contentId);
  const item = await getContentById(req.user!.id, contentId);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function createContentItem(req: Request, res: Response) {
  const input = contentCreateSchema.parse(req.body);
  const isAnnouncement = input.surface === "announcements";
  const title = isAnnouncement && !input.title ? "Announcement" : input.title;
  const content = isAnnouncement && !input.content ? "Announcement" : input.content;
  const audienceType = isAnnouncement ? (input.announcementAudienceType ?? "all") : null;
  const announcementCategory =
    !isAnnouncement || audienceType === "all"
      ? input.category
      : audienceType === "team"
        ? `target:team:${input.announcementAudienceTeam?.trim() ?? ""}`
        : audienceType === "group"
          ? `target:group:${input.announcementAudienceGroupId ?? ""}`
          : audienceType === "athlete_type"
            ? `target:athlete_type:${input.announcementAudienceAthleteType ?? ""}`
            : null;
  const announcementAgeList =
    !isAnnouncement || audienceType !== "age" || input.announcementAudienceAge === undefined
      ? input.ageList
      : [input.announcementAudienceAge];
  const announcementMinAge = !isAnnouncement || audienceType !== "age" ? input.minAge : undefined;
  const announcementMaxAge = !isAnnouncement || audienceType !== "age" ? input.maxAge : undefined;
  const announcementProgramTier =
    !isAnnouncement || audienceType !== "tier" ? input.programTier : input.announcementAudienceTier;

  const item = await createContent({
    title,
    content,
    type: input.type,
    body: input.body,
    programTier: announcementProgramTier,
    surface: input.surface,
    category: announcementCategory,
    ageList: announcementAgeList,
    minAge: announcementMinAge,
    maxAge: announcementMaxAge,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateContentItem(req: Request, res: Response) {
  const contentId = z.coerce.number().int().min(1).parse(req.params.contentId);
  const input = contentUpdateSchema.parse(req.body);
  const item = await updateContent({
    id: contentId,
    title: input.title,
    content: input.content,
    type: input.type,
    body: input.body,
    programTier: input.programTier,
    category: input.category,
    ageList: input.ageList,
    minAge: input.minAge,
    maxAge: input.maxAge,
  });
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function deleteContent(req: Request, res: Response) {
  const contentId = z.coerce.number().int().min(1).parse(req.params.contentId);
  const item = await deleteContentItem(contentId);
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ deleted: true });
}

export async function submitTestimonial(req: Request, res: Response) {
  const input = testimonialSubmissionSchema.parse(req.body);
  const athlete = req.user ? await getAthleteForUser(req.user.id) : null;
  const resolvedName = input.name?.trim() || athlete?.name || "Anonymous";

  const body = JSON.stringify({
    name: resolvedName,
    quote: input.quote,
    rating: input.rating,
    photoUrl: input.photoUrl ?? null,
    athleteName: athlete?.name ?? null,
  });
  const item = await createContent({
    title: `Testimonial: ${resolvedName}`,
    content: input.quote.slice(0, 140),
    type: "article",
    body,
    surface: "testimonial_submissions",
    category: "pending",
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function listTestimonialSubmissions(_req: Request, res: Response) {
  const items = await getTestimonialSubmissions();
  const pending = items.filter((item) => (item.category ?? "pending") !== "approved");
  return res.status(200).json({ items: pending });
}

export async function approveTestimonialSubmission(req: Request, res: Response) {
  const submissionId = z.coerce.number().int().min(1).parse(req.params.submissionId);
  const submission = await getContentByIdAdmin(submissionId);
  if (!submission || submission.surface !== "testimonial_submissions") {
    return res.status(404).json({ error: "Submission not found" });
  }

  let payload: any = {};
  if (submission.body) {
    try {
      payload = JSON.parse(submission.body);
    } catch {
      payload = {};
    }
  }

  const testimonialEntry = {
    id: `submission_${submission.id}`,
    name: payload.name ?? submission.title.replace(/^Testimonial:\s*/i, "").trim(),
    quote: payload.quote ?? submission.content,
    rating: payload.rating ?? 5,
    photoUrl: payload.photoUrl ?? null,
    role: payload.athleteName ? `Athlete: ${payload.athleteName}` : null,
  };

  const homeItems = await getHomeContentForUser(req.user!.id);
  const homeItem = homeItems[0];
  let homeBody: any = {};
  if (homeItem?.body) {
    try {
      homeBody = JSON.parse(homeItem.body);
    } catch {
      homeBody = {};
    }
  }
  const existing = Array.isArray(homeBody.testimonials) ? homeBody.testimonials : [];
  const already = existing.some((item: any) => item?.id === testimonialEntry.id);
  const nextTestimonials = already ? existing : [...existing, testimonialEntry];
  const updatedHomeBody = {
    ...homeBody,
    testimonials: nextTestimonials,
  };

  if (homeItem?.id) {
    await updateContent({
      id: homeItem.id,
      title: homeItem.title,
      content: homeItem.content,
      type: homeItem.type ?? "article",
      body: JSON.stringify(updatedHomeBody),
      programTier: homeItem.programTier,
      category: homeItem.category,
      minAge: homeItem.minAge,
      maxAge: homeItem.maxAge,
    });
  } else {
    await createContent({
      title: "Home",
      content: "Home",
      type: "article",
      body: JSON.stringify(updatedHomeBody),
      surface: "home",
      createdBy: req.user!.id,
    });
  }

  await updateContentCategory({ id: submission.id, category: "approved" });
  return res.status(200).json({ approved: true });
}

export async function rejectTestimonialSubmission(req: Request, res: Response) {
  const submissionId = z.coerce.number().int().min(1).parse(req.params.submissionId);
  const submission = await getContentByIdAdmin(submissionId);
  if (!submission || submission.surface !== "testimonial_submissions") {
    return res.status(404).json({ error: "Submission not found" });
  }
  await updateContentCategory({ id: submission.id, category: "rejected" });
  return res.status(200).json({ rejected: true });
}

export async function listParentCoursesHandler(req: Request, res: Response) {
  const role = (req.user as any)?.role as string | undefined;
  const items = await listParentCourses(req.user!.id, role);
  return res.status(200).json({ items });
}

export async function getParentCourseHandler(req: Request, res: Response) {
  const courseId = z.coerce.number().int().min(1).parse(req.params.courseId);
  const role = (req.user as any)?.role as string | undefined;
  const item = await getParentCourseById(req.user!.id, courseId, role);
  if (!item) {
    return res.status(404).json({ error: "Course not found" });
  }
  return res.status(200).json({ item });
}

export async function createParentCourseHandler(req: Request, res: Response) {
  const input = parentCourseCreateSchema.parse(req.body);
  const item = await createParentCourse({
    title: input.title,
    summary: input.summary,
    description: input.description,
    coverImage: input.coverImage,
    category: input.category,
    programTier: input.programTier,
    minAge: input.minAge,
    maxAge: input.maxAge,
    modules: input.modules,
    createdBy: req.user!.id,
  });
  return res.status(201).json({ item });
}

export async function updateParentCourseHandler(req: Request, res: Response) {
  console.log("Updating parent course:", req.params.courseId);
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  const courseId = z.coerce.number().int().min(1).parse(req.params.courseId);
  const input = parentCourseUpdateSchema.parse(req.body);
  const item = await updateParentCourse({
    id: courseId,
    title: input.title,
    summary: input.summary,
    description: input.description,
    coverImage: input.coverImage,
    category: input.category,
    programTier: input.programTier,
    minAge: input.minAge,
    maxAge: input.maxAge,
    modules: input.modules,
  });
  if (!item) {
    return res.status(404).json({ error: "Course not found" });
  }
  return res.status(200).json({ item });
}

export async function getParentCourseAiInsightController(req: Request, res: Response) {
  const courseId = z.coerce.number().int().min(1).parse(req.params.courseId);
  try {
    const insight = await getParentCourseAiInsight(courseId);
    return res.status(200).json({ insight });
  } catch (error) {
    console.error("[Content Controller] Error getting parent course insight:", error);
    return res.status(500).json({ error: "Failed to generate AI insight" });
  }
}

export async function getContentAiInsightController(req: Request, res: Response) {
  const contentId = z.coerce.number().int().min(1).parse(req.params.contentId);
  
  // Extract age if provided for better AI context (e.g., U14, U16)
  const ageQuery = req.query.age ? String(req.query.age) : null;
  
  try {
    const { getContentAiInsight } = await import("../services/content.service");
    const insight = await getContentAiInsight(contentId, ageQuery);
    return res.status(200).json({ insight });
  } catch (error) {
    console.error("[Content Controller] Error getting content AI insight:", error);
    return res.status(500).json({ error: "Failed to generate AI insight" });
  }
}
