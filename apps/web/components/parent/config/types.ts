export type FieldType = "text" | "number" | "dropdown";

export type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  visible: boolean;
  options?: string[];
  optionsByTeam?: Record<string, string[]>;
};

export type DocumentConfig = {
  id: string;
  label: string;
  required: boolean;
};

export const initialFields: FieldConfig[] = [
  { id: "athleteName", label: "Athlete Name", type: "text", required: true, visible: true },
  { id: "age", label: "Age", type: "number", required: true, visible: true },
  { id: "team", label: "Team", type: "dropdown", required: true, visible: true, options: ["Team A", "Team B"] },
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
  {
    id: "relationToAthlete",
    label: "Relation to Athlete",
    type: "dropdown",
    required: true,
    visible: true,
    options: ["Parent", "Guardian", "Coach"],
  },
  {
    id: "desiredProgramType",
    label: "Program Tier Selection",
    type: "dropdown",
    required: true,
    visible: true,
    options: ["PHP", "PHP_Plus", "PHP_Premium"],
  },
];

export const documentRequirements: DocumentConfig[] = [
  { id: "consent", label: "Guardian Consent Form", required: true },
  { id: "medical", label: "Medical Clearance", required: false },
  { id: "injury", label: "Injury Report (if applicable)", required: false },
  { id: "video", label: "Intro Training Video", required: false },
];
