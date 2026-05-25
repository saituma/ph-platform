import { eq, max } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTrainingSessionCompletionTable,
  trainingModuleSessionTable,
  trainingModuleTierLockTable,
  trainingModuleTable,
  trainingOtherContentTable,
  trainingOtherSettingTable,
  trainingOtherType,
  trainingSessionTierLockTable,
  trainingSessionBlockType,
  trainingSessionItemTable,
} from "../../db/schema";
import { normalizeAudienceLabel, ensureTrainingAudienceExists } from "./audience.service";
import { listTrainingContentAdminWorkspace } from "./admin.service";

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
        await tx
          .delete(athleteTrainingSessionCompletionTable)
          .where(eq(athleteTrainingSessionCompletionTable.sessionId, session.id));
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
            title: sourceSession.title ?? "Untitled session",
            dayLength: sourceSession.dayLength ?? 7,
            order: sourceSession.order ?? 1,
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
            title: sourceItem.title ?? "Untitled item",
            body: sourceItem.body ?? "",
            videoUrl: sourceItem.videoUrl ?? null,
            allowVideoUpload: Boolean(sourceItem.allowVideoUpload),
            metadata: sourceItem.metadata ?? null,
            order: sourceItem.order ?? 1,
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

export async function copySelectedModulesToAudience(input: {
  sourceAudienceLabel: string;
  targetAudienceLabel: string;
  moduleIds: number[];
  sessionIds: number[] | null;
  createdBy: number;
}) {
  const sourceAudienceLabel = normalizeAudienceLabel(input.sourceAudienceLabel);
  const targetAudienceLabel = normalizeAudienceLabel(input.targetAudienceLabel);

  const sourceWorkspace = await listTrainingContentAdminWorkspace(sourceAudienceLabel);
  await ensureTrainingAudienceExists(targetAudienceLabel, input.createdBy);

  const selectedModules = sourceWorkspace.modules.filter((m) => input.moduleIds.includes(m.id));

  if (!selectedModules.length) {
    throw new Error("No matching modules found in source.");
  }

  const targetWorkspace = await listTrainingContentAdminWorkspace(targetAudienceLabel);
  const usedOrders = new Set(targetWorkspace.modules.map((m) => m.order));

  return db.transaction(async (tx) => {
    for (const sourceModule of selectedModules) {
      let order = sourceModule.order;
      while (usedOrders.has(order)) order++;
      usedOrders.add(order);

      const [createdModule] = await tx
        .insert(trainingModuleTable)
        .values({
          age: 0,
          audienceLabel: targetAudienceLabel,
          title: sourceModule.title,
          order,
          createdBy: input.createdBy,
        })
        .returning();

      const sessions =
        input.sessionIds != null
          ? sourceModule.sessions.filter((s) => input.sessionIds!.includes(s.id))
          : sourceModule.sessions;

      for (const sourceSession of sessions) {
        const [createdSession] = await tx
          .insert(trainingModuleSessionTable)
          .values({
            moduleId: createdModule.id,
            title: sourceSession.title ?? "Untitled session",
            dayLength: sourceSession.dayLength ?? 7,
            order: sourceSession.order ?? 1,
          })
          .returning();

        for (const sourceItem of sourceSession.items) {
          await tx.insert(trainingSessionItemTable).values({
            sessionId: createdSession.id,
            blockType: sourceItem.blockType as (typeof trainingSessionBlockType.enumValues)[number],
            title: sourceItem.title ?? "Untitled item",
            body: sourceItem.body ?? "",
            videoUrl: sourceItem.videoUrl ?? null,
            allowVideoUpload: Boolean(sourceItem.allowVideoUpload),
            metadata: sourceItem.metadata ?? null,
            order: sourceItem.order ?? 1,
            createdBy: input.createdBy,
          });
        }
      }
    }

    return listTrainingContentAdminWorkspace(targetAudienceLabel);
  });
}

export async function copySelectedOtherItemsToAudience(input: {
  sourceAudienceLabel: string;
  targetAudienceLabel: string;
  itemIds: number[] | null;
  createdBy: number;
}) {
  const sourceAudienceLabel = normalizeAudienceLabel(input.sourceAudienceLabel);
  const targetAudienceLabel = normalizeAudienceLabel(input.targetAudienceLabel);

  if (sourceAudienceLabel === targetAudienceLabel) {
    throw new Error("Choose a different source to copy from.");
  }
  if (sourceAudienceLabel.startsWith("adult::") || targetAudienceLabel.startsWith("adult::")) {
    throw new Error("Supplementary content copy is only available for youth audiences.");
  }

  const sourceWorkspace = await listTrainingContentAdminWorkspace(sourceAudienceLabel);
  await ensureTrainingAudienceExists(targetAudienceLabel, input.createdBy);

  const allSourceItems = sourceWorkspace.others.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupType: group.type as (typeof trainingOtherType.enumValues)[number],
      groupEnabled: group.enabled,
    })),
  );
  const selectedItems =
    input.itemIds == null ? allSourceItems : allSourceItems.filter((item) => input.itemIds!.includes(item.id));

  if (!selectedItems.length) {
    throw new Error("No matching supplementary items found in source.");
  }

  return db.transaction(async (tx) => {
    const maxOrderRows = await tx
      .select({ type: trainingOtherContentTable.type, maxOrder: max(trainingOtherContentTable.order) })
      .from(trainingOtherContentTable)
      .where(eq(trainingOtherContentTable.audienceLabel, targetAudienceLabel))
      .groupBy(trainingOtherContentTable.type);
    const maxOrderByType = new Map<string, number>(maxOrderRows.map((r) => [r.type, r.maxOrder ?? 0]));

    const nextOrderByType = new Map<string, number>();
    const getNextOrder = (type: string) => {
      const base = maxOrderByType.get(type) ?? 0;
      const next = (nextOrderByType.get(type) ?? base) + 1;
      nextOrderByType.set(type, next);
      return next;
    };

    const sorted = [...selectedItems].sort((a, b) => {
      if (a.groupType !== b.groupType) return a.groupType.localeCompare(b.groupType);
      return (a.order ?? 0) - (b.order ?? 0);
    });

    for (const item of sorted) {
      await tx.insert(trainingOtherContentTable).values({
        age: 0,
        audienceLabel: targetAudienceLabel,
        type: item.groupType,
        title: item.title,
        body: item.body ?? "",
        scheduleNote: item.scheduleNote ?? null,
        videoUrl: item.videoUrl ?? null,
        posterUrl: item.posterUrl ?? null,
        durationSec: item.durationSec ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
        metadata: (item.metadata as Record<string, unknown>) ?? null,
        order: getNextOrder(item.groupType),
        createdBy: input.createdBy,
      });

      if (item.groupEnabled) {
        await tx
          .insert(trainingOtherSettingTable)
          .values({
            audienceLabel: targetAudienceLabel,
            type: item.groupType,
            enabled: true,
            createdBy: input.createdBy,
          })
          .onConflictDoNothing();
      }
    }

    return listTrainingContentAdminWorkspace(targetAudienceLabel);
  });
}
