import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  athleteTrainingSessionCompletionTable,
  trainingModuleSessionTable,
  trainingModuleTierLockTable,
  trainingModuleTable,
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
