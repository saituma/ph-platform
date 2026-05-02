import type { Request, Response } from "express";
import { z } from "zod";

import {
  createEnquiry,
  deleteEnquiry,
  getEnquiryById,
  getEnquiryStats,
  listEnquiries,
  updateEnquiryStatus,
} from "../services/enquiry.service";

const submitEnquirySchema = z.object({
  athleteType: z.enum(["youth", "adult"]).optional(),
  athleteName: z.string().trim().min(1).max(255),
  age: z.number().int().min(1).max(99).nullable().optional(),
  parentName: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(255),
  interestedIn: z.enum(["1-to-1 Private", "Semi-Private (2-4)", "Team Sessions", "App Only"]),
  locationPreference: z.array(z.string()).optional().default([]),
  groupNeeded: z.boolean().optional().default(false),
  teamName: z.string().trim().max(255).nullable().optional(),
  ageGroup: z.string().trim().max(50).nullable().optional(),
  squadSize: z.number().int().min(1).max(999).nullable().optional(),
  availabilityDays: z.array(z.string()).optional().default([]),
  availabilityTime: z.string().trim().max(100).nullable().optional(),
  goal: z.string().trim().max(5000).nullable().optional(),
  photoUrl: z.string().trim().max(1024).nullable().optional(),
});

export async function submitEnquiry(req: Request, res: Response) {
  const parsed = submitEnquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const data = parsed.data;

  if (data.athleteType === "youth" && !data.parentName) {
    return res.status(400).json({ error: "Parent/Guardian name is required for youth athletes." });
  }
  if (data.interestedIn === "Team Sessions" && !data.teamName) {
    return res.status(400).json({ error: "Team name is required for team session enquiries." });
  }

  const enquiry = await createEnquiry({
    athleteType: data.athleteType ?? null,
    athleteName: data.athleteName,
    age: data.age ?? null,
    parentName: data.parentName ?? null,
    phone: data.phone,
    email: data.email,
    interestedIn: data.interestedIn,
    locationPreference: data.locationPreference,
    groupNeeded: data.groupNeeded,
    teamName: data.teamName ?? null,
    ageGroup: data.ageGroup ?? null,
    squadSize: data.squadSize ?? null,
    availabilityDays: data.availabilityDays,
    availabilityTime: data.availabilityTime ?? null,
    goal: data.goal ?? null,
    photoUrl: data.photoUrl ?? null,
  });

  return res.status(201).json({ ok: true, enquiry });
}

export async function listEnquiriesAdmin(req: Request, res: Response) {
  const { status, service, search, page, limit, sort } = req.query;

  const result = await listEnquiries({
    status: status as string | undefined,
    service: service as string | undefined,
    search: search as string | undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Math.min(Number(limit), 100) : 50,
    sort: sort === "oldest" ? "oldest" : "newest",
  });

  return res.status(200).json(result);
}

export async function getEnquiryAdmin(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid enquiry ID." });

  const enquiry = await getEnquiryById(id);
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found." });

  return res.status(200).json({ enquiry });
}

const updateStatusSchema = z.object({
  status: z.enum(["new", "contacted", "booked", "closed"]),
  notes: z.string().trim().max(5000).optional(),
});

export async function updateEnquiryAdmin(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid enquiry ID." });

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors });
  }

  const enquiry = await updateEnquiryStatus(id, parsed.data.status, parsed.data.notes);
  return res.status(200).json({ ok: true, enquiry });
}

export async function deleteEnquiryAdmin(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) return res.status(400).json({ error: "Invalid enquiry ID." });

  await deleteEnquiry(id);
  return res.status(200).json({ ok: true });
}

export async function getEnquiryStatsAdmin(req: Request, res: Response) {
  const { from, to } = req.query;
  let period: { from: Date; to: Date } | undefined;

  if (from && to) {
    period = { from: new Date(from as string), to: new Date(to as string) };
  }

  const stats = await getEnquiryStats(period);
  return res.status(200).json(stats);
}
