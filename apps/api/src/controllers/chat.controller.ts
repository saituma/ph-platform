import type { Request, Response } from "express";
import { z } from "zod";

import {
  addGroupMembers,
  createGroup,
  createGroupMessage,
  deleteGroupMessage,
  isGroupMember,
  listGroupMembers,
  listGroupMessages,
  listGroupsForUser,
  markGroupRead,
} from "../services/chat.service";
import { toggleGroupMessageReaction } from "../services/reaction.service";

const createGroupSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["announcement", "coach_group", "team"]).default("coach_group"),
  memberIds: z.array(z.number().int().min(1)).default([]),
});

const addMembersSchema = z.object({
  memberIds: z.array(z.number().int().min(1)).min(1),
});

const sendGroupMessageSchema = z
  .object({
    content: z.string().trim().optional().default(""),
    contentType: z.enum(["text", "image", "video"]).default("text"),
    mediaUrl: z.string().url().optional(),
    replyToMessageId: z.number().int().min(1).optional(),
    replyPreview: z.string().trim().max(160).optional(),
  })
  .refine((value) => Boolean(value.content) || Boolean(value.mediaUrl), {
    message: "Message content or mediaUrl is required",
  });

const reactionSchema = z.object({
  emoji: z.string().min(1).max(16),
});

const listGroupsQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function listGroups(req: Request, res: Response) {
  const { q, limit } = listGroupsQuerySchema.parse(req.query ?? {});
  const groups = await listGroupsForUser(req.user!.id, { q, limit });
  return res.status(200).json({ groups });
}

export async function createGroupChat(req: Request, res: Response) {
  const input = createGroupSchema.parse(req.body);
  const group = await createGroup({
    name: input.name,
    category: input.category,
    createdBy: req.user!.id,
    memberIds: input.memberIds,
  });
  return res.status(201).json({ group });
}

export async function addMembers(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const input = addMembersSchema.parse(req.body);
  await addGroupMembers(groupId, input.memberIds);
  return res.status(200).json({ ok: true });
}

export async function listMembers(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const members = await listGroupMembers(groupId);
  return res.status(200).json({ members });
}

export async function listGroupChatMessages(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const allowed = await isGroupMember(groupId, req.user!.id);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const messages = await listGroupMessages(groupId);
  return res.status(200).json({ messages });
}

export async function sendGroupChatMessage(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const allowed = await isGroupMember(groupId, req.user!.id);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const input = sendGroupMessageSchema.parse(req.body);
  const message = await createGroupMessage({
    groupId,
    senderId: req.user!.id,
    content: input.content,
    contentType: input.contentType,
    mediaUrl: input.mediaUrl,
    replyToMessageId: input.replyToMessageId,
    replyPreview: input.replyPreview,
  });
  return res.status(201).json({ message });
}

export async function toggleGroupReaction(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const { emoji } = reactionSchema.parse(req.body);
  const allowed = await isGroupMember(groupId, req.user!.id);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const result = await toggleGroupMessageReaction({
      groupId,
      messageId,
      userId: req.user!.id,
      emoji,
    });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Message not found") {
      return res.status(404).json({ error: message });
    }
    throw error;
  }
}

export async function deleteGroupChatMessage(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const messageId = z.coerce.number().int().min(1).parse(req.params.messageId);
  const allowed = await isGroupMember(groupId, req.user!.id);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const result = await deleteGroupMessage({ groupId, messageId, userId: req.user!.id });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message === "Forbidden") {
      return res.status(403).json({ error: message });
    }
    if (message === "Message not found") {
      return res.status(404).json({ error: message });
    }
    throw error;
  }
}

export async function markGroupChatRead(req: Request, res: Response) {
  const groupId = z.coerce.number().int().min(1).parse(req.params.groupId);
  const allowed = await isGroupMember(groupId, req.user!.id);
  if (!allowed) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const updated = await markGroupRead({ groupId, userId: req.user!.id });
  if (!updated) {
    return res.status(404).json({ error: "Membership not found" });
  }
  return res.status(200).json({ ok: true });
}
