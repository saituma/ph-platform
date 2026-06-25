import type { Request, Response } from "express";
import {
  isThreadMuted,
  listMutedThreads,
  muteThread as muteThreadService,
  unmuteThread as unmuteThreadService,
} from "../services/conversation-mute.service";

const VALID_THREAD_RE = /^(group:\d+|\d+)$/;

function parseThreadId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  return VALID_THREAD_RE.test(id) ? id : null;
}

export async function listMutes(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id as number;
  const mutes = await listMutedThreads(userId);
  res.json({ mutes });
}

export async function getMuteStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id as number;
  const threadId = parseThreadId(req.params.threadId);
  if (!threadId) {
    res.status(400).json({ error: "Invalid threadId" });
    return;
  }
  const muted = await isThreadMuted(userId, threadId);
  res.json({ muted });
}

export async function muteThread(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id as number;
  const threadId = parseThreadId(req.body?.threadId);
  if (!threadId) {
    res.status(400).json({ error: "Invalid threadId" });
    return;
  }

  let mutedUntil: Date | null = null;
  if (req.body?.mutedUntil) {
    const d = new Date(req.body.mutedUntil);
    if (!isNaN(d.getTime())) mutedUntil = d;
  }

  await muteThreadService(userId, threadId, mutedUntil);
  res.json({ ok: true, muted: true, mutedUntil });
}

export async function unmuteThread(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.id as number;
  const threadId = parseThreadId(req.params.threadId);
  if (!threadId) {
    res.status(400).json({ error: "Invalid threadId" });
    return;
  }
  await unmuteThreadService(userId, threadId);
  res.json({ ok: true, muted: false });
}
