import { and, asc, eq } from "drizzle-orm";

import { db } from "../db";
import {
  ProgramType,
  athleteTable,
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
} from "../db/schema";

type ExerciseMetadata = {
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

const OTHER_LABELS: Record<(typeof trainingOtherType.enumValues)[number], string> = {
  mobility: "Mobility",
  recovery: "Recovery",
  inseason: "In-Season Program",
  offseason: "Off-Season Program",
  education: "Education",
};

const BLOCK_ORDER: Record<(typeof trainingSessionBlockType.enumValues)[number], number> = {
  warmup: 1,
  main: 2,
  cooldown: 3,
};

const PROGRAM_TIER_LABELS: Record<(typeof ProgramType.enumValues)[number], string> = {
  PHP: "PHP",
  PHP_Plus: "PHP Plus",
  PHP_Premium: "PHP Premium",
};

function normalizeAudienceLabel(input: string) {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return "All";
  if (/^all$/i.test(cleaned)) return "All";
  const rangeMatch = cleaned.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return `${min}-${max}`;
  }
  const exactMatch = cleaned.match(/^(\d{1,2})$/);
  if (exactMatch) {
    return String(Number(exactMatch[1]));
  }
  return cleaned;
}

function audienceMatchesAge(label: string, age: number) {
  const normalized = normalizeAudienceLabel(label);
  if (normalized === "All") return true;
  const exact = normalized.match(/^(\d{1,2})$/);
  if (exact) return Number(exact[1]) === age;
  const range = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return age >= min && age <= max;
  }
  return false;
}

function otherItemMatchesAgeLabel(label: string, age: number) {
  const normalized = normalizeAudienceLabel(label);
  if (normalized === label && !/^(\d{1,2})(-(\d{1,2}))?$/.test(normalized)) {
    return false;
  }
  return audienceMatchesAge(normalized, age);
}

function audienceScore(label: string, age: number) {
  const normalized = normalizeAudienceLabel(label);
  if (!audienceMatchesAge(normalized, age)) return -1;
  if (normalized === "All") return 1;
  const exact = normalized.match(/^(\d{1,2})$/);
  if (exact) return 1000;
  const range = normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if (range) {
    const span = Number(range[2]) - Number(range[1]);
    return 500 - span;
  }
  return 10;
}

function sortItemsByBlockThenOrder<T extends { blockType: string; order: number | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const blockA = BLOCK_ORDER[a.blockType as keyof typeof BLOCK_ORDER] ?? 99;
    const blockB = BLOCK_ORDER[b.blockType as keyof typeof BLOCK_ORDER] ?? 99;
    if (blockA !== blockB) return blockA - blockB;
    return (a.order ?? 9999) - (b.order ?? 9999);
  });
}

async function ensureTrainingAudienceExists(audienceLabel: string, createdBy: number) {
  const normalizedAudienceLabel = normalizeAudienceLabel(audienceLabel);
  const existing = await db
    .select({ id: trainingAudienceTable.id, label: trainingAudienceTable.label })
    .from(trainingAudienceTable)
    .where(eq(trainingAudienceTable.label, normalizedAudienceLabel));
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(trainingAudienceTable)
    .values({
      label: normalizedAudienceLabel,
      createdBy,
    })
    .onConflictDoNothing({ target: trainingAudienceTable.label })
    .returning({ id: trainingAudienceTable.id, label: trainingAudienceTable.label });
  if (created) return created;

  const fallback = await db
    .select({ id: trainingAudienceTable.id, label: trainingAudienceTable.label })
    .from(trainingAudienceTable)
    .where(eq(trainingAudienceTable.label, normalizedAudienceLabel));
  return fallback[0] ?? null;
}

async function getNextModuleOrder(audienceLabel: string) {
  const rows = await db
    .select({ order: trainingModuleTable.order })
    .from(trainingModuleTable)
    .where(eq(trainingModuleTable.audienceLabel, audienceLabel));
  return (rows.reduce((max, row) => Math.max(max, row.order ?? 0), 0) || 0) + 1;
}

async function getNextSessionOrder(moduleId: number) {
  const rows = await db
    .select({ order: trainingModuleSessionTable.order })
    .from(trainingModuleSessionTable)
    .where(eq(trainingModuleSessionTable.moduleId, moduleId));
  return (rows.reduce((max, row) => Math.max(max, row.order ?? 0), 0) || 0) + 1;
}

async function getNextItemOrder(sessionId: number, blockType: (typeof trainingSessionBlockType.enumValues)[number]) {
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

async function getNextOtherOrder(audienceLabel: string, type: (typeof trainingOtherType.enumValues)[number]) {
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

async function getTrainingOtherSettings(audienceLabel: string) {
  return db
    .select()
    .from(trainingOtherSettingTable)
    .where(eq(trainingOtherSettingTable.audienceLabel, audienceLabel))
    .orderBy(asc(trainingOtherSettingTable.type), asc(trainingOtherSettingTable.id));
}

async function getTrainingModuleTierLocks(audienceLabel: string) {
  return db
    .select()
    .from(trainingModuleTierLockTable)
    .where(eq(trainingModuleTierLockTable.audienceLabel, audienceLabel))
    .orderBy(asc(trainingModuleTierLockTable.programTier), asc(trainingModuleTierLockTable.id));
}

async function getTrainingSessionTierLocks(moduleIds: number[]) {
  if (!moduleIds.length) return [];
  const rows = await db
    .select()
    .from(trainingSessionTierLockTable)
    .orderBy(asc(trainingSessionTierLockTable.moduleId), asc(trainingSessionTierLockTable.programTier), asc(trainingSessionTierLockTable.id));
  const allowedIds = new Set(moduleIds);
  return rows.filter((row) => allowedIds.has(row.moduleId));
}

export async function listTrainingAudiences() {
  const [registeredAudiences, modules, others] = await Promise.all([
    db.select({ label: trainingAudienceTable.label }).from(trainingAudienceTable),
    db
      .select({ audienceLabel: trainingModuleTable.audienceLabel, id: trainingModuleTable.id })
      .from(trainingModuleTable),
    db
      .select({ audienceLabel: trainingOtherContentTable.audienceLabel, id: trainingOtherContentTable.id })
      .from(trainingOtherContentTable),
  ]);

  const byAudience = new Map<string, { label: string; moduleCount: number; otherCount: number }>();
  for (const row of registeredAudiences) {
    const label = normalizeAudienceLabel(row.label);
    byAudience.set(label, byAudience.get(label) ?? { label, moduleCount: 0, otherCount: 0 });
  }
  for (const row of modules) {
    const label = normalizeAudienceLabel(row.audienceLabel);
    const current = byAudience.get(label) ?? { label, moduleCount: 0, otherCount: 0 };
    current.moduleCount += 1;
    byAudience.set(label, current);
  }
  for (const row of others) {
    const label = normalizeAudienceLabel(row.audienceLabel);
    const current = byAudience.get(label) ?? { label, moduleCount: 0, otherCount: 0 };
    current.otherCount += 1;
    byAudience.set(label, current);
  }

  return [...byAudience.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export async function createTrainingAudience(input: { label: string; createdBy: number }) {
  return ensureTrainingAudienceExists(input.label, input.createdBy);
}

export async function copyTrainingModulesFromAudience(input: {
  sourceAudienceLabel: string;
  targetAudienceLabel: string;
  createdBy: number;
}) {
  const sourceAudienceLabel = normalizeAudienceLabel(input.sourceAudienceLabel);
  const targetAudienceLabel = normalizeAudienceLabel(input.targetAudienceLabel);

  if (sourceAudienceLabel === targetAudienceLabel) {
    throw new Error("Choose a different source age to copy from.");
  }

  const sourceWorkspace = await listTrainingContentAdminWorkspace(sourceAudienceLabel);
  await ensureTrainingAudienceExists(targetAudienceLabel, input.createdBy);

  return db.transaction(async (tx) => {
    const copiedModuleIdBySourceId = new Map<number, number>();
    const existingModules = await tx
      .select({ id: trainingModuleTable.id })
      .from(trainingModuleTable)
      .where(eq(trainingModuleTable.audienceLabel, targetAudienceLabel));

    for (const module of existingModules) {
      const sessions = await tx
        .select({ id: trainingModuleSessionTable.id })
        .from(trainingModuleSessionTable)
        .where(eq(trainingModuleSessionTable.moduleId, module.id));

      for (const session of sessions) {
        await tx.delete(athleteTrainingSessionCompletionTable).where(eq(athleteTrainingSessionCompletionTable.sessionId, session.id));
        await tx.delete(trainingSessionItemTable).where(eq(trainingSessionItemTable.sessionId, session.id));
      }

      await tx.delete(trainingModuleSessionTable).where(eq(trainingModuleSessionTable.moduleId, module.id));
      await tx.delete(trainingModuleTable).where(eq(trainingModuleTable.id, module.id));
    }

    await tx
      .delete(trainingModuleTierLockTable)
      .where(eq(trainingModuleTierLockTable.audienceLabel, targetAudienceLabel));

    for (const sourceModule of sourceWorkspace.modules) {
      const [createdModule] = await tx
        .insert(trainingModuleTable)
        .values({
          age: 0,
          audienceLabel: targetAudienceLabel,
          title: sourceModule.title,
          order: sourceModule.order,
          createdBy: input.createdBy,
        })
        .returning();
      copiedModuleIdBySourceId.set(sourceModule.id, createdModule.id);

      for (const sourceSession of sourceModule.sessions) {
        const [createdSession] = await tx
          .insert(trainingModuleSessionTable)
          .values({
            moduleId: createdModule.id,
            title: sourceSession.title,
            dayLength: sourceSession.dayLength,
            order: sourceSession.order,
          })
          .returning();

        for (const programTier of sourceSession.lockedForTiers ?? []) {
          await tx
            .insert(trainingSessionTierLockTable)
            .values({
              moduleId: createdModule.id,
              programTier,
              startSessionId: createdSession.id,
              createdBy: input.createdBy,
            })
            .onConflictDoUpdate({
              target: [trainingSessionTierLockTable.moduleId, trainingSessionTierLockTable.programTier],
              set: {
                startSessionId: createdSession.id,
                updatedAt: new Date(),
              },
            });
        }

        for (const sourceItem of sourceSession.items) {
          await tx.insert(trainingSessionItemTable).values({
            sessionId: createdSession.id,
            blockType: sourceItem.blockType as (typeof trainingSessionBlockType.enumValues)[number],
            title: sourceItem.title,
            body: sourceItem.body,
            videoUrl: sourceItem.videoUrl ?? null,
            allowVideoUpload: Boolean(sourceItem.allowVideoUpload),
            metadata: sourceItem.metadata ?? null,
            order: sourceItem.order,
            createdBy: input.createdBy,
          });
        }
      }
    }

    for (const sourceLock of sourceWorkspace.moduleLocks) {
      const copiedModuleId = copiedModuleIdBySourceId.get(sourceLock.startModuleId);
      if (!copiedModuleId) continue;
      await tx
        .insert(trainingModuleTierLockTable)
        .values({
          audienceLabel: targetAudienceLabel,
          programTier: sourceLock.programTier,
          startModuleId: copiedModuleId,
          createdBy: input.createdBy,
        })
        .onConflictDoUpdate({
          target: [trainingModuleTierLockTable.audienceLabel, trainingModuleTierLockTable.programTier],
          set: {
            startModuleId: copiedModuleId,
            updatedAt: new Date(),
          },
        });
    }

    return listTrainingContentAdminWorkspace(targetAudienceLabel);
  });
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

  const nextModule = modules.find((module) => module.order > throughModule.order) ?? null;
  const moduleOrderById = new Map(modules.map((module) => [module.id, module.order]));
  const currentLocks = await getTrainingModuleTierLocks(normalizedAudienceLabel);
  const lockByTier = new Map(currentLocks.map((lock) => [lock.programTier, lock]));

  for (const programTier of input.programTiers) {
    const currentLock = lockByTier.get(programTier);
    if (!currentLock) continue;

    const currentStartOrder = moduleOrderById.get(currentLock.startModuleId);
    if (currentStartOrder == null || currentStartOrder > throughModule.order) {
      continue;
    }

    if (!nextModule) {
      await db.delete(trainingModuleTierLockTable).where(eq(trainingModuleTierLockTable.id, currentLock.id));
      continue;
    }

    await db
      .update(trainingModuleTierLockTable)
      .set({
        startModuleId: nextModule.id,
        updatedAt: new Date(),
      })
      .where(eq(trainingModuleTierLockTable.id, currentLock.id));
  }

  return listTrainingContentAdminWorkspace(normalizedAudienceLabel);
}

export async function updateTrainingSessionTierLocks(input: {
  moduleId: number;
  sessionId: number | null;
  programTiers: (typeof ProgramType.enumValues)[number][];
  createdBy: number;
}) {
  if (!input.programTiers.length) {
    const moduleRows = await db
      .select({ audienceLabel: trainingModuleTable.audienceLabel })
      .from(trainingModuleTable)
      .where(eq(trainingModuleTable.id, input.moduleId))
      .limit(1);
    if (!moduleRows[0]) {
      throw new Error("Module not found.");
    }
    return listTrainingContentAdminWorkspace(moduleRows[0].audienceLabel);
  }

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

export async function getTrainingContentMobileWorkspace(input: {
  age: number;
  athleteId: number | null;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
}) {
  const audiences = await listTrainingAudiences();
  const bestAudience = audiences
    .map((item) => ({ ...item, score: audienceScore(item.label, input.age) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)[0];

  const selectedAudienceLabel = bestAudience?.label ?? "All";
  const workspace = await listTrainingContentAdminWorkspace(selectedAudienceLabel);
  const completionRows = input.athleteId
    ? await db
        .select()
        .from(athleteTrainingSessionCompletionTable)
        .where(eq(athleteTrainingSessionCompletionTable.athleteId, input.athleteId))
    : [];
  const completionSet = new Set(completionRows.map((row) => row.sessionId));
  const athleteTier =
    input.programTier ??
    (
      input.athleteId
        ? (
            await db
              .select({ currentProgramTier: athleteTable.currentProgramTier })
              .from(athleteTable)
              .where(eq(athleteTable.id, input.athleteId))
              .limit(1)
          )[0]?.currentProgramTier ?? null
        : null
    );
  const tierLockStartModuleId = athleteTier
    ? workspace.moduleLocks.find((lock) => lock.programTier === athleteTier)?.startModuleId ?? null
    : null;
  const tierLockStartOrder = tierLockStartModuleId
    ? workspace.modules.find((module) => module.id === tierLockStartModuleId)?.order ?? null
    : null;

  let priorModuleComplete = true;
  const modules = workspace.modules.map((module) => {
    const tierLocked = tierLockStartOrder != null && module.order >= tierLockStartOrder;
    const sessionLockStartOrderByTier = new Map<(typeof ProgramType.enumValues)[number], number>();
    for (const session of module.sessions) {
      for (const tier of session.lockedForTiers ?? []) {
        if (sessionLockStartOrderByTier.has(tier)) continue;
        sessionLockStartOrderByTier.set(tier, session.order);
      }
    }
    const sessionTierLockStartOrder = athleteTier ? sessionLockStartOrderByTier.get(athleteTier) ?? null : null;
    let priorSessionComplete = true;
    const sessions = module.sessions.map((session) => {
      const completed = completionSet.has(session.id);
      const sessionTierLocked = sessionTierLockStartOrder != null && session.order >= sessionTierLockStartOrder;
      const locked = tierLocked || sessionTierLocked || !priorModuleComplete || !priorSessionComplete;
      if (!completed) {
        priorSessionComplete = false;
      }
      return {
        id: session.id,
        title: session.title,
        dayLength: session.dayLength,
        order: session.order,
        completed,
        locked,
        items: sortItemsByBlockThenOrder(session.items).map((item) => ({ ...item })),
      };
    });
    const completed = sessions.length > 0 && sessions.every((session) => session.completed);
    const locked = tierLocked || !priorModuleComplete;
    if (!completed) {
      priorModuleComplete = false;
    }
    return {
      id: module.id,
      title: module.title,
      order: module.order,
      totalDayLength: module.totalDayLength,
      completed,
      locked,
      sessions,
    };
  });

  const availableOtherSections = workspace.others
    .map((group) => {
      if (group.type !== "inseason") return group;
      const matchingAgeGroupIds = new Set(
        group.items
          .filter((item) => {
            const metadata =
              item.metadata && typeof item.metadata === "object"
                ? (item.metadata as Record<string, unknown>)
                : null;
            const kind = typeof metadata?.kind === "string" ? metadata.kind : "";
            if (kind !== "inseason_age_group") return false;
            return otherItemMatchesAgeLabel(item.title, input.age);
          })
          .map((item) => item.id),
      );
      return {
        ...group,
        items: group.items.filter((item) => {
          const metadata =
            item.metadata && typeof item.metadata === "object"
              ? (item.metadata as Record<string, unknown>)
              : null;
          const kind = typeof metadata?.kind === "string" ? metadata.kind : "";
          if (kind === "inseason_age_schedule") {
            return otherItemMatchesAgeLabel(item.title, input.age);
          }
          if (kind !== "inseason_schedule_entry") return false;
          const ageGroupId = typeof metadata?.ageGroupId === "number" ? metadata.ageGroupId : null;
          return ageGroupId != null && matchingAgeGroupIds.has(ageGroupId);
        }),
      };
    })
    .filter((group) => group.enabled && group.items.length > 0);
  return {
    age: input.age,
    audienceLabel: selectedAudienceLabel,
    tabs: ["Modules", ...availableOtherSections.map((group) => group.label)],
    modules,
    others: availableOtherSections,
  };
}

export async function finishTrainingModuleSession(input: { athleteId: number; sessionId: number }) {
  const existing = await db
    .select()
    .from(athleteTrainingSessionCompletionTable)
    .where(eq(athleteTrainingSessionCompletionTable.athleteId, input.athleteId));
  const found = existing.find((row) => row.sessionId === input.sessionId);
  if (found) return found;
  const [row] = await db
    .insert(athleteTrainingSessionCompletionTable)
    .values({
      athleteId: input.athleteId,
      sessionId: input.sessionId,
    })
    .returning();
  return row;
}

export function trainingOtherLabel(type: (typeof trainingOtherType.enumValues)[number]) {
  return OTHER_LABELS[type];
}
