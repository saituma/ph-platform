import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  ProgramType,
  athleteTable,
  athleteTrainingSessionCompletionTable,
} from "../../db/schema";
import {
  audienceScore,
  listTrainingAudiences,
  otherItemMatchesAgeLabel,
} from "./audience.service";
import {
  listTrainingContentAdminWorkspace,
  sortItemsByBlockThenOrder,
} from "./admin.service";

export async function getTrainingContentMobileWorkspace(input: {
  age: number;
  athleteId: number | null;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
}) {
  const audiences = await listTrainingAudiences();
  const audienceScores = audiences.map((item) => ({
    ...item,
    score: audienceScore(item.label, input.age),
  }));

  const bestAudience = audienceScores
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
      for (const tier of (session as any).lockedForTiers ?? []) {
        if (sessionLockStartOrderByTier.has(tier)) continue;
        sessionLockStartOrderByTier.set(tier, session.order!);
      }
    }
    const sessionTierLockStartOrder = athleteTier ? sessionLockStartOrderByTier.get(athleteTier) ?? null : null;
    let priorSessionComplete = true;
    const sessions = module.sessions.map((session) => {
      const completed = completionSet.has(session.id);
      const sessionTierLocked = sessionTierLockStartOrder != null && session.order! >= sessionTierLockStartOrder;
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
        items: sortItemsByBlockThenOrder(session.items as any[]).map((item) => ({ ...item })),
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
