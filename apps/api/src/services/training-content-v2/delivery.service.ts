import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  ProgramType,
  athleteTable,
  athleteTrainingSessionCompletionTable,
  athleteTrainingSessionWorkoutLogTable,
} from "../../db/schema";
import { audienceScore, listTrainingAudiences, otherItemMatchesAgeLabel } from "./audience.service";
import { listTrainingContentAdminWorkspace, PROGRAM_TIER_LABELS, sortItemsByBlockThenOrder } from "./admin.service";

const ADULT_AUDIENCE_PREFIX = "adult::";
const TEAM_AUDIENCE_PREFIX = "team::";
const DEFAULT_ADULT_PROGRAM_TIER: (typeof ProgramType.enumValues)[number] = "PHP";

const PROGRAM_TIER_ORDER: (typeof ProgramType.enumValues)[number][] = [
  "PHP",
  "PHP_Premium",
  "PHP_Premium_Plus",
  "PHP_Pro",
];

function tiersAbove(tier: (typeof ProgramType.enumValues)[number]) {
  const idx = PROGRAM_TIER_ORDER.indexOf(tier);
  if (idx < 0) return [];
  return PROGRAM_TIER_ORDER.slice(idx + 1);
}

function hasTeam(team: string | null | undefined) {
  const normalized = String(team ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return normalized !== "unknown";
}

function formatTeamAudienceLabel(team: string) {
  const normalized = team.trim().replace(/\s+/g, " ").replace(/::+/g, ":");
  const maxTeamLength = 64 - TEAM_AUDIENCE_PREFIX.length;
  const clipped = normalized.length > maxTeamLength ? normalized.slice(0, maxTeamLength).trim() : normalized;
  return `${TEAM_AUDIENCE_PREFIX}${clipped || "All"}`;
}

export async function getTrainingContentMobileWorkspace(input: {
  age: number;
  athleteId: number | null;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  team?: string | null;
}) {
  const resolvedAthleteTier =
    input.programTier ??
    (input.athleteId
      ? ((
          await db
            .select({ currentProgramTier: athleteTable.currentProgramTier })
            .from(athleteTable)
            .where(eq(athleteTable.id, input.athleteId))
            .limit(1)
        )[0]?.currentProgramTier ?? null)
      : null);
  const isAdult = input.age >= 18;
  const effectiveTier = isAdult ? (resolvedAthleteTier ?? DEFAULT_ADULT_PROGRAM_TIER) : resolvedAthleteTier;
  const selectedAudienceLabel = hasTeam(input.team)
    ? formatTeamAudienceLabel(input.team!.trim())
    : isAdult
      ? `${ADULT_AUDIENCE_PREFIX}${PROGRAM_TIER_LABELS[effectiveTier!]}`
      : (() => {
          // Youth still selects by age.
          // Audience labels are age ranges (e.g. "12-14") or "All".
          return null;
        })();

  const resolvedAudienceLabel = selectedAudienceLabel ? selectedAudienceLabel : "age_scored";

  const workspace =
    resolvedAudienceLabel === "age_scored"
      ? await (async () => {
          const audiences = await listTrainingAudiences();
          const audienceScores = audiences.map((item) => ({
            ...item,
            score: audienceScore(item.label, input.age),
          }));

          const bestAudience = audienceScores.filter((item) => item.score >= 0).sort((a, b) => b.score - a.score)[0];

          const label = bestAudience?.label ?? "All";
          return listTrainingContentAdminWorkspace(label);
        })()
      : await listTrainingContentAdminWorkspace(resolvedAudienceLabel);
  const completionRows = input.athleteId
    ? await db
        .select()
        .from(athleteTrainingSessionCompletionTable)
        .where(eq(athleteTrainingSessionCompletionTable.athleteId, input.athleteId))
    : [];
  const completionSet = new Set(completionRows.map((row) => row.sessionId));

  const moduleIdToOrder = new Map<number, number | null>();
  for (const m of workspace.modules) {
    moduleIdToOrder.set(m.id, m.order ?? null);
  }

  const moduleTierLockStartOrderByTier = new Map<(typeof ProgramType.enumValues)[number], number>();
  for (const lock of workspace.moduleLocks) {
    const startOrder = moduleIdToOrder.get(lock.startModuleId) ?? null;
    if (startOrder == null) continue;
    moduleTierLockStartOrderByTier.set(lock.programTier, startOrder);
  }

  const tierLockStartModuleId = effectiveTier
    ? (workspace.moduleLocks.find((lock) => lock.programTier === effectiveTier)?.startModuleId ?? null)
    : null;
  const tierLockStartOrder = tierLockStartModuleId
    ? (workspace.modules.find((module) => module.id === tierLockStartModuleId)?.order ?? null)
    : null;

  let priorModuleComplete = true;
  const modules = workspace.modules.map((module) => {
    const tierLocked = tierLockStartOrder != null && module.order >= tierLockStartOrder;

    const moduleUnlockTiers =
      effectiveTier && tierLocked
        ? tiersAbove(effectiveTier)
            .filter((tier) => {
              const startOrder = moduleTierLockStartOrderByTier.get(tier) ?? null;
              return startOrder == null || module.order < startOrder;
            })
            .map((tier) => ({ tier, label: PROGRAM_TIER_LABELS[tier] }))
        : [];

    const sessionLockStartOrderByTier = new Map<(typeof ProgramType.enumValues)[number], number>();
    for (const session of module.sessions) {
      for (const tier of (session as any).lockedForTiers ?? []) {
        if (sessionLockStartOrderByTier.has(tier)) continue;
        sessionLockStartOrderByTier.set(tier, session.order!);
      }
    }
    const sessionTierLockStartOrder = effectiveTier ? (sessionLockStartOrderByTier.get(effectiveTier) ?? null) : null;
    let priorSessionComplete = true;
    const sessions = module.sessions.map((session) => {
      const completed = completionSet.has(session.id);
      const sessionTierLocked = sessionTierLockStartOrder != null && session.order! >= sessionTierLockStartOrder;
      const sequenceLocked = !priorModuleComplete || !priorSessionComplete;
      const tierLockedAny = tierLocked || sessionTierLocked;
      const locked = tierLockedAny || sequenceLocked;

      const sessionUnlockTiers =
        effectiveTier && tierLockedAny
          ? tiersAbove(effectiveTier)
              .filter((tier) => {
                const moduleStartOrder = moduleTierLockStartOrderByTier.get(tier) ?? null;
                const moduleTierLockedForCandidate = moduleStartOrder != null && module.order >= moduleStartOrder;
                if (moduleTierLockedForCandidate) return false;

                const sessionStartOrder = sessionLockStartOrderByTier.get(tier) ?? null;
                const sessionTierLockedForCandidate = sessionStartOrder != null && session.order! >= sessionStartOrder;
                return !sessionTierLockedForCandidate;
              })
              .map((tier) => ({ tier, label: PROGRAM_TIER_LABELS[tier] }))
          : [];

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
        lockedReason: locked ? (tierLockedAny ? "tier" : "sequence") : null,
        unlockTiers: locked && tierLockedAny ? sessionUnlockTiers : [],
        // Do not deliver session items while locked (prevents clients from "peeking" ahead).
        items: locked ? [] : sortItemsByBlockThenOrder(session.items as any[]).map((item) => ({ ...item })),
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
      lockedReason: locked ? (tierLocked ? "tier" : "sequence") : null,
      unlockTiers: locked && tierLocked ? moduleUnlockTiers : [],
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
              item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : null;
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
            item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : null;
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

function summarizeWorkoutSessionItems(
  items: Array<{ title: string; body: string; blockType?: string | null }> | undefined,
) {
  const list = Array.isArray(items) ? items : [];
  const preferred =
    list.find((item) => item.blockType === "main" && (item.body || item.title)) ??
    list.find((item) => item.body || item.title) ??
    null;
  if (!preferred) return "";

  const source = String(preferred.body || preferred.title || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!source) return "";
  return source.length > 160 ? `${source.slice(0, 157).trimEnd()}...` : source;
}

function collectWorkoutTags(
  items: Array<{ title: string; metadata?: Record<string, unknown> | null }> | undefined,
  sessionTitle: string,
) {
  const tags = new Set<string>();
  const lowerTitle = sessionTitle.toLowerCase();

  if (lowerTitle.includes("recovery")) tags.add("Recovery");
  if (lowerTitle.includes("tempo")) tags.add("Tempo");
  if (lowerTitle.includes("interval")) tags.add("Intervals");
  if (lowerTitle.includes("progressive")) tags.add("Progressive");
  if (lowerTitle.includes("long")) tags.add("Endurance");
  if (lowerTitle.includes("speed")) tags.add("Speed");

  for (const item of items ?? []) {
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : null;
    const category = typeof metadata?.category === "string" ? metadata.category.trim() : "";
    const equipment = typeof metadata?.equipment === "string" ? metadata.equipment.trim() : "";
    if (category) tags.add(category);
    if (equipment) tags.add(equipment);
    if (tags.size >= 3) break;
  }

  return Array.from(tags).slice(0, 3);
}

export async function getTrainingContentMobileWorkouts(input: {
  age: number;
  athleteId: number;
  programTier?: (typeof ProgramType.enumValues)[number] | null;
  team?: string | null;
}) {
  const workspace = await getTrainingContentMobileWorkspace(input);
  const workoutLogs = await db
    .select()
    .from(athleteTrainingSessionWorkoutLogTable)
    .where(eq(athleteTrainingSessionWorkoutLogTable.athleteId, input.athleteId));

  const workoutLogBySessionId = new Map(workoutLogs.map((row) => [row.sessionId, row]));
  const workouts = workspace.modules.flatMap((module) =>
    module.sessions.map((session) => {
      const items = Array.isArray(session.items) ? session.items : [];
      const blockCounts = items.reduce(
        (acc, item) => {
          if (item.blockType === "warmup") acc.warmup += 1;
          else if (item.blockType === "cooldown") acc.cooldown += 1;
          else acc.main += 1;
          return acc;
        },
        { warmup: 0, main: 0, cooldown: 0 },
      );
      const workoutLog = workoutLogBySessionId.get(session.id) ?? null;
      return {
        sessionId: session.id,
        moduleId: module.id,
        moduleTitle: module.title,
        moduleOrder: module.order,
        title: session.title,
        dayLength: session.dayLength,
        order: session.order,
        completed: session.completed,
        locked: session.locked,
        lockedReason: session.lockedReason ?? null,
        unlockTiers: Array.isArray(session.unlockTiers) ? session.unlockTiers : [],
        summary: summarizeWorkoutSessionItems(items),
        tags: collectWorkoutTags(items as any[], session.title),
        itemCount: items.length,
        blockCounts,
        workoutLog: workoutLog
          ? {
              weightsUsed: workoutLog.weightsUsed,
              repsCompleted: workoutLog.repsCompleted,
              rpe: workoutLog.rpe,
              updatedAt: workoutLog.updatedAt,
            }
          : null,
      };
    }),
  );

  const nextWorkout = workouts.find((item) => !item.locked && !item.completed) ?? null;

  return {
    generatedAt: new Date().toISOString(),
    nextWorkoutSessionId: nextWorkout?.sessionId ?? null,
    completedCount: workouts.filter((item) => item.completed).length,
    totalCount: workouts.length,
    workouts,
  };
}

export async function finishTrainingModuleSession(input: { athleteId: number; sessionId: number }) {
  return finishTrainingModuleSessionWithLog({
    athleteId: input.athleteId,
    sessionId: input.sessionId,
    workoutLog: null,
  });
}

export async function finishTrainingModuleSessionWithLog(input: {
  athleteId: number;
  sessionId: number;
  workoutLog: null | {
    weightsUsed: string | null;
    repsCompleted: string | null;
    rpe: number | null;
  };
}) {
  const now = new Date();

  return db.transaction(async (tx) => {
    if (input.workoutLog) {
      await tx
        .insert(athleteTrainingSessionWorkoutLogTable)
        .values({
          athleteId: input.athleteId,
          sessionId: input.sessionId,
          weightsUsed: input.workoutLog.weightsUsed,
          repsCompleted: input.workoutLog.repsCompleted,
          rpe: input.workoutLog.rpe,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [athleteTrainingSessionWorkoutLogTable.athleteId, athleteTrainingSessionWorkoutLogTable.sessionId],
          set: {
            weightsUsed: input.workoutLog.weightsUsed,
            repsCompleted: input.workoutLog.repsCompleted,
            rpe: input.workoutLog.rpe,
            updatedAt: now,
          },
        });
    }

    const [inserted] = await tx
      .insert(athleteTrainingSessionCompletionTable)
      .values({
        athleteId: input.athleteId,
        sessionId: input.sessionId,
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [athleteTrainingSessionCompletionTable.athleteId, athleteTrainingSessionCompletionTable.sessionId],
      })
      .returning();

    if (inserted) return inserted;

    const [existing] = await tx
      .select()
      .from(athleteTrainingSessionCompletionTable)
      .where(
        and(
          eq(athleteTrainingSessionCompletionTable.athleteId, input.athleteId),
          eq(athleteTrainingSessionCompletionTable.sessionId, input.sessionId),
        ),
      )
      .limit(1);

    return existing ?? null;
  });
}
