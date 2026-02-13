import type { Request, Response } from "express";
import { z } from "zod";

import {
  addGroupMembers,
  createGroup,
  createGroupMessage,
  isGroupMember,
  listGroupMembers,
  listGroupMessages,
  listGroupsForUser,
} from "../services/chat.service";

const createGroupSchema = z.object({
  name: z.string().min(1),
  memberIds: z.array(z.number().int().min(1)).default([]),
});

const addMembersSchema = z.object({
  memberIds: z.array(z.number().int().min(1)).min(1),
});

const sendGroupMessageSchema = z.object({
  content: z.string().min(1),
});

export async function listGroups(req: Request, res: Response) {
  const groups = await listGroupsForUser(req.user!.id);
  return res.status(200).json({ groups });
}

export async function createGroupChat(req: Request, res: Response) {
  const input = createGroupSchema.parse(req.body);
  const group = await createGroup({
    name: input.name,
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
  });
  return res.status(201).json({ message });
}
