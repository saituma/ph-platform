import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  ProgramType,
  athleteTrainingSessionCompletionTable,
  trainingAudienceTable,
  trainingModuleSessionTable,
  trainingModuleTierLockTable,
  trainingModuleTable,
  trainingOtherContentTable,
  trainingOtherSettingTable,
  trainingSessionTierLockTable,
  trainingOtherType,
  trainingSessionBlockType,
  trainingSessionItemTable,
} from "../../db/schema";
import { normalizeAudienceLabel, ensureTrainingAudienceExists, listTrainingAudiences } from "./audience.service";

export type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

export const OTHER_LABELS: Record<(typeof trainingOtherType.enumValues)[number], string> = {
  warmup: "Warm-Up",
  cooldown: "Cool-Down",
  mobility: "Mobility",
  recovery: "Recovery",
  inseason: "In-Season Program",
  offseason: "Off-Season Program",
  education: "Education",
};

export const BLOCK_ORDER: Record<(typeof trainingSessionBlockType.enumValues)[number], number> = {
  warmup: 1,
  main: 2,
  cooldown: 3,
};

export const PROGRAM_TIER_LABELS: Record<(typeof ProgramType.enumValues)[number], string> = {
  PHP: "PHP Program",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

export function sortItemsByBlockThenOrder<T extends { blockType: string; order: number | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const blockA = BLOCK_ORDER[a.blockType as keyof typeof BLOCK_ORDER] ?? 99;
    const blockB = BLOCK_ORDER[b.blockType as keyof typeof BLOCK_ORDER] ?? 99;
    if (blockA !== blockB) return blockA - blockB;
    return (a.order ?? 9999) - (b.order ?? 9999);
  });
}

export async function getNextModuleOrder(audienceLabel: string) {
  const rows = await db
    .select({ order: trainingModuleTable.order })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, audienceLabel));
  return (rows.reduce((max, row) => Math.max(max, row.order ?? 0), 0) || 0) + 1;
}

export async function getNextSessionOrder(moduleId: number) {
  const rows = await db
    .select({ order: trainingModuleSessionTable.order })
    .from(trainingModuleSessionTable)
    .where(eq(trainingModuleSessionTable.moduleId, moduleId));
  return (rows.reduce((max, row) => Math.max(max, row.order ?? 0), 0) || 0) + 1;
}

export async function getNextItemOrder(sessionId: number, blockType: (typeof trainingSessionBlockType.enumValues)[number]) {
  const rows = await db
    .select({ order: trainingSessionItemTable.order, blockType: trainingSessionItemTable.blockType })
    .from(trainingSessionItemTable)
    .where(eq(trainingSessionItemTable.sessionId, sessionId));
  return (
    rows
      .filter((row) => row.blockType === blockType)
      .reduce((max, row) => Math.max(max, row.order ?? 0), 0) || 0
  ) + 1;
}

export async function getNextOtherOrder(audienceLabel: string, type: (typeof trainingOtherType.enumValues)[number]) {
  const rows = await db
    .select({ order: trainingOtherContentTable.order, type: trainingOtherContentTable.type })
    .from(trainingOtherContentTable)
    .where(eq(trainingOtherContentTable.audienceLabel, audienceLabel));
  return (
    rows
      .filter((row) => row.type === type)
      .reduce((max, row) => Math.max(max, row.order ?? 0), 0) || 0
  ) + 1;
}

export async function getTrainingOtherSettings(audienceLabel: string) {
  return db
    .select()
    .from(trainingOtherSettingTable)
    .where(eq(trainingOtherSettingTable.audienceLabel, audienceLabel))
    .orderBy(asc(trainingOtherSettingTable.type), asc(trainingOtherSettingTable.id));
}

export async function getTrainingModuleTierLocks(audienceLabel: string) {
  return db
    .select()
    .from(trainingModuleTierLockTable)
    .where(eq(trainingModuleTierLockTable.audienceLabel, audienceLabel))
    .orderBy(asc(trainingModuleTierLockTable.programTier), asc(trainingModuleTierLockTable.id));
}

export async function getTrainingSessionTierLocks(moduleIds: number[]) {
  if (!moduleIds.length) return [];
  const rows = await db
    .select()
    .from(trainingSessionTierLockTable)
    .orderBy(asc(trainingSessionTierLockTable.moduleId), asc(trainingSessionTierLockTable.programTier), asc(trainingSessionTierLockTable.id));
  const allowedIds = new Set(moduleIds);
  return rows.filter((row) => allowedIds.has(row.moduleId));
}

export async function listTrainingContentAdminWorkspace(audienceLabel: string) {
  const normalizedAudienceLabel = normalizeAudienceLabel(audienceLabel);
  const [modules, sessions, items, others, otherSettings, moduleLocks] = await Promise.all([
    db
      .select()
      .from(trainingModuleTable)
      .where(eq(trainingModuleTable.audienceLabel, normalizedAudienceLabel))
      .orderBy(asc(trainingModuleTable.order), asc(trainingModuleTable.id)),
    db
      .select()
      .from(trainingModuleSessionTable)
      .orderBy(asc(trainingModuleSessionTable.order), asc(trainingModuleSessionTable.id)),
    db
      .select()
      .from(trainingSessionItemTable)
      .orderBy(asc(trainingSessionItemTable.order), asc(trainingSessionItemTable.id)),
    db
      .select()
      .from(trainingOtherContentTable)
      .where(eq(trainingOtherContentTable.audienceLabel, normalizedAudienceLabel))
      .orderBy(asc(trainingOtherContentTable.type), asc(trainingOtherContentTable.order), asc(trainingOtherContentTable.id)),
    getTrainingOtherSettings(normalizedAudienceLabel),
    getTrainingModuleTierLocks(normalizedAudienceLabel),
  ]);

  const moduleIds = new Set(modules.map((module) => module.id));
  const filteredSessions = sessions.filter((session) => moduleIds.has(session.moduleId));
  const sessionIds = new Set(filteredSessions.map((session) => session.id));
  const filteredItems = items.filter((item) => sessionIds.has(item.sessionId));
  const sessionLocks = await getTrainingSessionTierLocks(modules.map((module) => module.id));
  const moduleLockMap = new Map<number, (typeof ProgramType.enumValues)[number][]>();
  for (const lock of moduleLocks) {
    const current = moduleLockMap.get(lock.startModuleId) ?? [];
    current.push(lock.programTier);
    moduleLockMap.set(lock.startModuleId, current);
  }

  const sessionLockMap = new Map<number, (typeof ProgramType.enumValues)[number][]>();
  for (const lock of sessionLocks) {
    const current = sessionLockMap.get(lock.startSessionId) ?? [];
    current.push(lock.programTier);
    sessionLockMap.set(lock.startSessionId, current);
  }

  return {
    audienceLabel: normalizedAudienceLabel,
    modules: modules.map((module) => {
      const moduleSessions = filteredSessions
        .filter((session) => session.moduleId === module.id)
        .map((session) => ({
          ...session,
          lockedForTiers: sessionLockMap.get(session.id) ?? [],
          items: sortItemsByBlockThenOrder(filteredItems.filter((item) => item.sessionId === session.id)),
        }));
      return {
        ...module,
        audienceLabel: normalizedAudienceLabel,
        totalDayLength: moduleSessions.reduce((sum, session) => sum + (session.dayLength ?? 0), 0),
        lockedForTiers: moduleLockMap.get(module.id) ?? [],
        sessions: moduleSessions,
      };
    }),
    moduleLocks: moduleLocks.map((lock) => ({
      id: lock.id,
      audienceLabel: lock.audienceLabel,
      programTier: lock.programTier,
      label: PROGRAM_TIER_LABELS[lock.programTier],
      startModuleId: lock.startModuleId,
    })),
    others: trainingOtherType.enumValues.map((type) => ({
      type,
      label: OTHER_LABELS[type],
      enabled: otherSettings.find((setting) => setting.type === type)?.enabled ?? others.some((item) => item.type === type),
      items: others.filter((item) => item.type === type),
    })),
  };
}

export async function createTrainingModule(input: {
  audienceLabel: string;
  title: string;
  createdBy: number;
  order?: number | null;
}) {
  const normalizedAudienceLabel = normalizeAudienceLabel(input.audienceLabel);
  await ensureTrainingAudienceExists(normalizedAudienceLabel, input.createdBy);
  const order = input.order ?? (await getNextModuleOrder(normalizedAudienceLabel));
  const [row] = await db
    .insert(trainingModuleTable)
    .values({
      age: 0,
      audienceLabel: normalizedAudienceLabel,
      title: input.title.trim(),
      order,
      createdBy: input.createdBy,
    })
    .returning();
  return row;
}

export async function updateTrainingModule(input: { id: number; title: string; order?: number | null }) {
  const [row] = await db
    .update(trainingModuleTable)
    .set({
      title: input.title.trim(),
      ...(input.order != null ? { order: input.order } : {}),
      updatedAt: new Date(),
    })
    .where(eq(trainingModuleTable.id, input.id))
    .returning();
  return row ?? null;
}

export async function deleteTrainingModule(id: number) {
  await db.delete(trainingModuleTierLockTable).where(eq(trainingModuleTierLockTable.startModuleId, id));
  await db.delete(trainingSessionTierLockTable).where(eq(trainingSessionTierLockTable.moduleId, id));
  const sessions = await db
    .select({ id: trainingModuleSessionTable.id })
    .from(trainingModuleSessionTable)
    .where(eq(trainingModuleSessionTable.moduleId, id));
  for (const session of sessions) {
    await db.delete(athleteTrainingSessionCompletionTable).where(eq(athleteTrainingSessionCompletionTable.sessionId, session.id));
    await db.delete(trainingSessionItemTable).where(eq(trainingSessionItemTable.sessionId, session.id));
  }
  await db.delete(trainingModuleSessionTable).where(eq(trainingModuleSessionTable.moduleId, id));
  const [row] = await db.delete(trainingModuleTable).where(eq(trainingModuleTable.id, id)).returning();
  return row ?? null;
}

export async function createTrainingModuleSession(input: {
  moduleId: number;
  title: string;
  dayLength: number;
  order?: number | null;
}) {
  const order = input.order ?? (await getNextSessionOrder(input.moduleId));
  const [row] = await db
    .insert(trainingModuleSessionTable)
    .values({
      moduleId: input.moduleId,
      title: input.title.trim(),
      dayLength: input.dayLength,
      order,
    })
    .returning();
  return row;
}

export async function updateTrainingModuleSession(input: {
  id: number;
  title: string;
  dayLength: number;
  order?: number | null;
}) {
  const [row] = await db
    .update(trainingModuleSessionTable)
    .set({
      title: input.title.trim(),
      dayLength: input.dayLength,
      ...(input.order != null ? { order: input.order } : {}),
      updatedAt: new Date(),
    })
    .where(eq(trainingModuleSessionTable.id, input.id))
    .returning();
  return row ?? null;
}

export async function deleteTrainingModuleSession(id: number) {
  await db.delete(trainingSessionTierLockTable).where(eq(trainingSessionTierLockTable.startSessionId, id));
  await db.delete(athleteTrainingSessionCompletionTable).where(eq(athleteTrainingSessionCompletionTable.sessionId, id));
  await db.delete(trainingSessionItemTable).where(eq(trainingSessionItemTable.sessionId, id));
  const [row] = await db.delete(trainingModuleSessionTable).where(eq(trainingModuleSessionTable.id, id)).returning();
  return row ?? null;
}

export async function createTrainingSessionItem(input: {
  sessionId: number;
  blockType: (typeof trainingSessionBlockType.enumValues)[number];
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  createdBy: number;
  order?: number | null;
}) {
  const order = input.order ?? (await getNextItemOrder(input.sessionId, input.blockType));
  const [row] = await db
    .insert(trainingSessionItemTable)
    .values({
      sessionId: input.sessionId,
      blockType: input.blockType,
      title: input.title.trim(),
      body: input.body.trim(),
      videoUrl: input.videoUrl ?? null,
      allowVideoUpload: Boolean(input.allowVideoUpload),
      metadata: input.metadata ?? null,
      createdBy: input.createdBy,
      order,
    })
    .returning();
  return row;
}

export async function updateTrainingSessionItem(input: {
  id: number;
  blockType: (typeof trainingSessionBlockType.enumValues)[number];
  title: string;
  body: string;
  videoUrl?: string | null;
  allowVideoUpload?: boolean | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
}) {
  const [row] = await db
    .update(trainingSessionItemTable)
    .set({
      blockType: input.blockType,
      title: input.title.trim(),
      body: input.body.trim(),
      videoUrl: input.videoUrl ?? null,
      allowVideoUpload: Boolean(input.allowVideoUpload),
      metadata: input.metadata ?? null,
      ...(input.order != null ? { order: input.order } : {}),
      updatedAt: new Date(),
    })
    .where(eq(trainingSessionItemTable.id, input.id))
    .returning();
  return row ?? null;
}

export async function deleteTrainingSessionItem(id: number) {
  const [row] = await db.delete(trainingSessionItemTable).where(eq(trainingSessionItemTable.id, id)).returning();
  return row ?? null;
}

export async function createTrainingOtherContent(input: {
  audienceLabel: string;
  type: (typeof trainingOtherType.enumValues)[number];
  title: string;
  body: string;
  scheduleNote?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy: number;
  order?: number | null;
}) {
  const normalizedAudienceLabel = normalizeAudienceLabel(input.audienceLabel);
  await ensureTrainingAudienceExists(normalizedAudienceLabel, input.createdBy);
  const order = input.order ?? (await getNextOtherOrder(normalizedAudienceLabel, input.type));
  const [row] = await db
    .insert(trainingOtherContentTable)
    .values({
      age: 0,
      audienceLabel: normalizedAudienceLabel,
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      scheduleNote: input.scheduleNote?.trim() ? input.scheduleNote.trim() : null,
      videoUrl: input.videoUrl ?? null,
      metadata: input.metadata ?? null,
      createdBy: input.createdBy,
      order,
    })
    .returning();
  return row;
}

export async function updateTrainingOtherContent(input: {
  id: number;
  type: (typeof trainingOtherType.enumValues)[number];
  title: string;
  body: string;
  scheduleNote?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  order?: number | null;
}) {
  const [row] = await db
    .update(trainingOtherContentTable)
    .set({
      type: input.type,
      title: input.title.trim(),
      body: input.body.trim(),
      scheduleNote: input.scheduleNote?.trim() ? input.scheduleNote.trim() : null,
      videoUrl: input.videoUrl ?? null,
      metadata: input.metadata ?? null,
      ...(input.order != null ? { order: input.order } : {}),
      updatedAt: new Date(),
    })
    .where(eq(trainingOtherContentTable.id, input.id))
    .returning();
  return row ?? null;
}

export async function deleteTrainingOtherContent(id: number) {
  const [row] = await db.delete(trainingOtherContentTable).where(eq(trainingOtherContentTable.id, id)).returning();
  return row ?? null;
}

export async function updateTrainingOtherTypeSetting(input: {
  audienceLabel: string;
  type: (typeof trainingOtherType.enumValues)[number];
  enabled: boolean;
  createdBy: number;
}) {
  const normalizedAudienceLabel = normalizeAudienceLabel(input.audienceLabel);
  await ensureTrainingAudienceExists(normalizedAudienceLabel, input.createdBy);

  const existing = await getTrainingOtherSettings(normalizedAudienceLabel);
  const current = existing.find((row) => row.type === input.type);

  if (current) {
    const [updated] = await db
      .update(trainingOtherSettingTable)
      .set({
        enabled: input.enabled,
        updatedAt: new Date(),
      })
      .where(eq(trainingOtherSettingTable.id, current.id))
      .returning();
    return updated ?? null;
  }

  const [created] = await db
    .insert(trainingOtherSettingTable)
    .values({
      audienceLabel: normalizedAudienceLabel,
      type: input.type,
      enabled: input.enabled,
      createdBy: input.createdBy,
    })
    .returning();
  return created ?? null;
}

export async function updateTrainingModuleTierLocks(input: {
  audienceLabel: string;
  moduleId: number | null;
  programTiers: (typeof ProgramType.enumValues)[number][];
  createdBy: number;
}) {
  const normalizedAudienceLabel = normalizeAudienceLabel(input.audienceLabel);
  await ensureTrainingAudienceExists(normalizedAudienceLabel, input.createdBy);

  if (!input.programTiers.length) {
    return listTrainingContentAdminWorkspace(normalizedAudienceLabel);
  }

  if (input.moduleId != null) {
    const modules = await db
      .select({ id: trainingModuleTable.id, audienceLabel: trainingModuleTable.audienceLabel })
      .from(trainingModuleTable)
      .where(eq(trainingModuleTable.id, input.moduleId));
    if (!modules[0] || modules[0].audienceLabel !== normalizedAudienceLabel) {
      throw new Error("Module not found for this audience.");
    }
  }

  for (const programTier of input.programTiers) {
    if (input.moduleId == null) {
      await db
        .delete(trainingModuleTierLockTable)
        .where(and(
          eq(trainingModuleTierLockTable.audienceLabel, normalizedAudienceLabel),
          eq(trainingModuleTierLockTable.programTier, programTier),
        ));
      continue;
    }

    await db
      .insert(trainingModuleTierLockTable)
      .values({
        audienceLabel: normalizedAudienceLabel,
        programTier,
        startModuleId: input.moduleId,
        createdBy: input.createdBy,
      })
      .onConflictDoUpdate({
        target: [trainingModuleTierLockTable.audienceLabel, trainingModuleTierLockTable.programTier],
        set: {
          startModuleId: input.moduleId,
          updatedAt: new Date(),
        },
      });
  }

  return listTrainingContentAdminWorkspace(normalizedAudienceLabel);
}

export async function unlockTrainingModuleTierLocks(input: {
  audienceLabel: string;
  throughModuleId: number;
  programTiers: (typeof ProgramType.enumValues)[number][];
  createdBy: number;
}) {
  const normalizedAudienceLabel = normalizeAudienceLabel(input.audienceLabel);
  await ensureTrainingAudienceExists(normalizedAudienceLabel, input.createdBy);

  if (!input.programTiers.length) {
    return listTrainingContentAdminWorkspace(normalizedAudienceLabel);
  }

  const modules = await db
    .select({ id: trainingModuleTable.id, order: trainingModuleTable.order, audienceLabel: trainingModuleTable.audienceLabel })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, normalizedAudienceLabel))
    .orderBy(asc(trainingModuleTable.order), asc(trainingModuleTable.id));

  const throughModule = modules.find((module) => module.id === input.throughModuleId);
  if (!throughModule || throughModule.audienceLabel !== normalizedAudienceLabel) {
    throw new Error("Module not found for this audience.");
  }

  const moduleOrderById = new Map(modules.map((module) => [module.id, module.order]));
  const currentLocks = await getTrainingModuleTierLocks(normalizedAudienceLabel);
  const lockByTier = new Map(currentLocks.map((lock) => [lock.programTier, lock]));
  const nextExistingModule = modules.find((module) => module.order > throughModule.order) ?? null;

  for (const programTier of input.programTiers) {
    const currentLock = lockByTier.get(programTier);
    if (!currentLock) continue;

    const currentStartOrder = moduleOrderById.get(currentLock.startModuleId);
    if (currentStartOrder == null || currentStartOrder > throughModule.order) {
      continue;
    }

    if (!nextExistingModule) {
      await db.delete(trainingModuleTierLockTable).where(eq(trainingModuleTierLockTable.id, currentLock.id));
      continue;
    }

    await db
      .update(trainingModuleTierLockTable)
      .set({
        startModuleId: nextExistingModule.id,
        updatedAt: new Date(),
      })
      .where(eq(trainingModuleTierLockTable.id, currentLock.id));
  }

  return listTrainingContentAdminWorkspace(normalizedAudienceLabel);
}

export async function cleanupTrainingPlaceholderModules(input: {
  audienceLabel: string;
  createdBy: number;
}) {
  const normalizedAudienceLabel = normalizeAudienceLabel(input.audienceLabel);
  await ensureTrainingAudienceExists(normalizedAudienceLabel, input.createdBy);

  const modules = await db
    .select({
      id: trainingModuleTable.id,
      title: trainingModuleTable.title,
      order: trainingModuleTable.order,
    })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, normalizedAudienceLabel))
    .orderBy(asc(trainingModuleTable.order), asc(trainingModuleTable.id));

  if (!modules.length) {
    return {
      deletedCount: 0,
      deletedModuleOrders: [] as number[],
      workspace: await listTrainingContentAdminWorkspace(normalizedAudienceLabel),
    };
  }

  const sessionRows = await db
    .select({
      moduleId: trainingModuleSessionTable.moduleId,
    })
    .from(trainingModuleSessionTable);
  const locks = await getTrainingModuleTierLocks(normalizedAudienceLabel);

  const moduleIds = new Set(modules.map((module) => module.id));
  const modulesWithSessions = new Set(sessionRows.filter((row) => moduleIds.has(row.moduleId)).map((row) => row.moduleId));
  const lockStartIds = new Set(locks.map((lock) => lock.startModuleId));

  const deletableModules = modules.filter((module) => {
    const expectedTitle = `Module ${module.order}`;
    return module.title.trim() === expectedTitle && !modulesWithSessions.has(module.id) && !lockStartIds.has(module.id);
  });

  if (deletableModules.length) {
    for (const module of deletableModules) {
      await db.delete(trainingModuleTable).where(eq(trainingModuleTable.id, module.id));
    }
  }

  return {
    deletedCount: deletableModules.length,
    deletedModuleOrders: deletableModules.map((module) => module.order),
    workspace: await listTrainingContentAdminWorkspace(normalizedAudienceLabel),
  };
}

export async function updateTrainingSessionTierLocks(input: {
  moduleId: number;
  sessionId: number | null;
  programTiers: (typeof ProgramType.enumValues)[number][];
  createdBy: number;
}) {
  const moduleRows = await db
    .select({ id: trainingModuleTable.id, audienceLabel: trainingModuleTable.audienceLabel })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.id, input.moduleId))
    .limit(1);
  if (!moduleRows[0]) {
    throw new Error("Module not found.");
  }

  if (input.sessionId != null) {
    const sessionRows = await db
      .select({ id: trainingModuleSessionTable.id, moduleId: trainingModuleSessionTable.moduleId })
      .from(trainingModuleSessionTable)
      .where(eq(trainingModuleSessionTable.id, input.sessionId))
      .limit(1);
    if (!sessionRows[0] || sessionRows[0].moduleId !== input.moduleId) {
      throw new Error("Session not found for this module.");
    }
  }

  for (const programTier of input.programTiers) {
    if (input.sessionId == null) {
      await db
        .delete(trainingSessionTierLockTable)
        .where(and(
          eq(trainingSessionTierLockTable.moduleId, input.moduleId),
          eq(trainingSessionTierLockTable.programTier, programTier),
        ));
      continue;
    }

    await db
      .insert(trainingSessionTierLockTable)
      .values({
        moduleId: input.moduleId,
        programTier,
        startSessionId: input.sessionId,
        createdBy: input.createdBy,
      })
      .onConflictDoUpdate({
        target: [trainingSessionTierLockTable.moduleId, trainingSessionTierLockTable.programTier],
        set: {
          startSessionId: input.sessionId,
          updatedAt: new Date(),
        },
      });
  }

  return listTrainingContentAdminWorkspace(moduleRows[0].audienceLabel);
}
