export type OtherSectionType =
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
