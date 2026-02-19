import type { Request, Response } from "express";
import { z } from "zod";

import {
  createContent,
  getHomeContentForUser,
  getParentPlatformContent,
  getLegalContentForUser,
  getLegalContent,
  updateContent,
  getContentById,
  getContentByIdAdmin,
  listParentCourses,
  getParentCourseById,
  createParentCourse,
  updateParentCourse,
  getTestimonialSubmissions,
  updateContentCategory,
} from "../services/content.service";
import { ProgramType, contentType } from "../db/schema";

const contentCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(contentType.enumValues),
  body: z.string().optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  surface: z.enum(["home", "parent_platform", "legal", "announcements", "testimonial_submissions"]),
  category: z.string().optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
}).refine((data) => data.minAge === undefined || data.maxAge === undefined || data.minAge <= data.maxAge, {
  message: "Minimum age must be less than or equal to maximum age.",
  path: ["minAge"],
});

const contentUpdateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(contentType.enumValues),
  body: z.string().optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  category: z.string().optional(),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
}).refine((data) => data.minAge === undefined || data.maxAge === undefined || data.minAge <= data.maxAge, {
  message: "Minimum age must be less than or equal to maximum age.",
  path: ["minAge"],
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
  name: z.string().min(1),
  quote: z.string().min(1),
  photoUrl: z.string().url().optional().nullable(),
});

export async function listHomeContent(req: Request, res: Response) {
  const items = await getHomeContentForUser(req.user!.id);
  return res.status(200).json({ items });
}

export async function listParentContent(req: Request, res: Response) {
  const items = await getParentPlatformContent(req.user!.id);
  return res.status(200).json({ items });
}

export async function listLegalContent(req: Request, res: Response) {
  const items = await getLegalContentForUser();
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
  const item = await createContent({
    title: input.title,
    content: input.content,
    type: input.type,
    body: input.body,
    programTier: input.programTier,
    surface: input.surface,
    category: input.category,
    minAge: input.minAge,
    maxAge: input.maxAge,
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
    minAge: input.minAge,
    maxAge: input.maxAge,
  });
  if (!item) {
    return res.status(404).json({ error: "Content not found" });
  }
  return res.status(200).json({ item });
}

export async function submitTestimonial(req: Request, res: Response) {
  const input = testimonialSubmissionSchema.parse(req.body);
  const body = JSON.stringify({
    name: input.name,
    quote: input.quote,
    photoUrl: input.photoUrl ?? null,
  });
  const item = await createContent({
    title: `Testimonial: ${input.name}`,
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
    photoUrl: payload.photoUrl ?? null,
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
