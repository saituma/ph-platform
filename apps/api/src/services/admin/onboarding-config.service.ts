import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  onboardingConfigTable,
  ProgramType,
} from "../../db/schema";

export const defaultOnboardingConfig = {
  version: 1,
  fields: [
    { id: "athleteName", label: "Athlete Name", type: "text", required: true, visible: true },
    { id: "birthDate", label: "Birth Date", type: "date", required: true, visible: true },
    {
      id: "team",
      label: "Team",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["Team A", "Team B"],
    },
    {
      id: "level",
      label: "Level",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["U12", "U14", "U16", "U18"],
      optionsByTeam: {
        "Team A": ["U12", "U14"],
        "Team B": ["U16", "U18"],
      },
    },
    { id: "trainingPerWeek", label: "Training Days / Week", type: "number", required: true, visible: true },
    { id: "injuries", label: "Injuries / History", type: "text", required: true, visible: true },
    { id: "growthNotes", label: "Growth Notes", type: "text", required: false, visible: true },
    { id: "performanceGoals", label: "Performance Goals", type: "text", required: true, visible: true },
    { id: "equipmentAccess", label: "Equipment Access", type: "text", required: true, visible: true },
    { id: "parentEmail", label: "Guardian Email", type: "text", required: true, visible: true },
    { id: "parentPhone", label: "Guardian Phone", type: "text", required: false, visible: true },
  ],
  requiredDocuments: [
    { id: "consent", label: "Guardian Consent Form", required: true },
  ],
  welcomeMessage: "Welcome to PH Performance. Let's get your athlete set up.",
  coachMessage: "Need help? Your coach is ready to support you.",
  defaultProgramTier: "PHP" as (typeof ProgramType.enumValues)[number],
  approvalWorkflow: "manual",
  notes: "",
  phpPlusProgramTabs: [
    "Program",
    "Warmups",
    "Cool Downs",
    "Mobility",
    "Recovery",
    "In-Season Program",
    "Off-Season Program",
    "Video Upload",
    "Submit Diary",
    "Bookings",
  ],
};

const PHP_PLUS_TABS = new Set(defaultOnboardingConfig.phpPlusProgramTabs);

const normalizePhpPlusTabs = (input: unknown) => {
  if (!Array.isArray(input)) return null;
  const normalized = input
    .map((tab) => String(tab))
    .filter((tab) => PHP_PLUS_TABS.has(tab));
  return normalized;
};

export async function getOnboardingConfig() {
  const configs = await db.select().from(onboardingConfigTable).limit(1);
  if (configs[0]) return configs[0];

  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: defaultOnboardingConfig.version,
      fields: defaultOnboardingConfig.fields,
      requiredDocuments: defaultOnboardingConfig.requiredDocuments,
      welcomeMessage: defaultOnboardingConfig.welcomeMessage,
      coachMessage: defaultOnboardingConfig.coachMessage,
      defaultProgramTier: defaultOnboardingConfig.defaultProgramTier,
      approvalWorkflow: defaultOnboardingConfig.approvalWorkflow,
      notes: defaultOnboardingConfig.notes,
      phpPlusProgramTabs: defaultOnboardingConfig.phpPlusProgramTabs,
    } as any)
    .returning();

  return created[0];
}

export async function getPhpPlusProgramTabsAdmin() {
  const config = await getOnboardingConfig();
  const normalized = normalizePhpPlusTabs(config?.phpPlusProgramTabs);
  return normalized ?? defaultOnboardingConfig.phpPlusProgramTabs;
}

export async function setPhpPlusProgramTabsAdmin(
  userId: number,
  tabs: unknown
) {
  const normalized = normalizePhpPlusTabs(tabs);
  const existing = await db.select().from(onboardingConfigTable).limit(1);
  if (existing[0]) {
    const updated = await db
      .update(onboardingConfigTable)
      .set({
        phpPlusProgramTabs: normalized,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(onboardingConfigTable.id, existing[0].id))
      .returning();
    return updated[0];
  }
  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: defaultOnboardingConfig.version,
      fields: defaultOnboardingConfig.fields,
      requiredDocuments: defaultOnboardingConfig.requiredDocuments,
      welcomeMessage: defaultOnboardingConfig.welcomeMessage,
      coachMessage: defaultOnboardingConfig.coachMessage,
      defaultProgramTier: defaultOnboardingConfig.defaultProgramTier,
      approvalWorkflow: defaultOnboardingConfig.approvalWorkflow,
      notes: defaultOnboardingConfig.notes,
      phpPlusProgramTabs: normalized,
      createdBy: userId,
      updatedBy: userId,
    } as any)
    .returning();
  return created[0];
}

export async function clearPhpPlusProgramTabsAdmin(userId: number) {
  return setPhpPlusProgramTabsAdmin(userId, []);
}

export async function updateOnboardingConfig(
  userId: number,
  input: {
    version: number;
    fields: any;
    requiredDocuments: any;
    welcomeMessage?: string | null;
    coachMessage?: string | null;
    defaultProgramTier?: (typeof ProgramType.enumValues)[number];
    approvalWorkflow: string;
    notes?: string | null;
    phpPlusProgramTabs?: string[] | null;
  }
) {
  const normalizedPhpPlusTabs = normalizePhpPlusTabs(input.phpPlusProgramTabs);
  const existing = await db.select().from(onboardingConfigTable).limit(1);
  const resolvedDefaultTier =
    input.defaultProgramTier ?? existing[0]?.defaultProgramTier ?? ("PHP" as (typeof ProgramType.enumValues)[number]);
  if (existing[0]) {
    const updated = await db
      .update(onboardingConfigTable)
      .set({
        version: input.version,
        fields: input.fields,
        requiredDocuments: input.requiredDocuments,
        welcomeMessage: input.welcomeMessage ?? null,
        coachMessage: input.coachMessage ?? null,
        defaultProgramTier: resolvedDefaultTier,
        approvalWorkflow: input.approvalWorkflow,
        notes: input.notes ?? null,
        phpPlusProgramTabs: normalizedPhpPlusTabs,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(onboardingConfigTable.id, existing[0].id))
      .returning();
    return updated[0];
  }

  const created = await db
    .insert(onboardingConfigTable)
    .values({
      version: input.version,
      fields: input.fields,
      requiredDocuments: input.requiredDocuments,
      welcomeMessage: input.welcomeMessage ?? null,
      coachMessage: input.coachMessage ?? null,
      defaultProgramTier: resolvedDefaultTier,
      approvalWorkflow: input.approvalWorkflow,
      notes: input.notes ?? null,
      phpPlusProgramTabs: normalizedPhpPlusTabs,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return created[0];
}
