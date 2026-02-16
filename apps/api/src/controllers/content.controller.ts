import type { Request, Response } from "express";
import { z } from "zod";

import {
  createContent,
  getHomeContentForUser,
  getParentPlatformContent,
  updateContent,
  getContentById,
  listParentCourses,
  getParentCourseById,
  createParentCourse,
  updateParentCourse,
} from "../services/content.service";
import { ProgramType, contentType } from "../db/schema";

const contentCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(contentType.enumValues),
  body: z.string().optional(),
  programTier: z.enum(ProgramType.enumValues).optional(),
  surface: z.enum(["home", "parent_platform"]),
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

export async function listHomeContent(req: Request, res: Response) {
  const items = await getHomeContentForUser(req.user!.id);
  return res.status(200).json({ items });
}

export async function listParentContent(req: Request, res: Response) {
  const items = await getParentPlatformContent(req.user!.id);
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
