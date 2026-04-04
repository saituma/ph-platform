export type OtherSectionType =
  | "warmup"
  | "cooldown"
  | "mobility"
  | "recovery"
  | "inseason"
  | "offseason"
  | "education";

export type OtherSectionConfig = {
  type: OtherSectionType;
  label: string;
  summary: string;
  concept: "content" | "age-schedule";
};
