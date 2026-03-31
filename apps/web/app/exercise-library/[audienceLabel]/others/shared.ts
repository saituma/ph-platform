import type { OtherSectionConfig, OtherSectionType } from "./types";

import { educationSection } from "./types/education";
import { inseasonSection } from "./types/inseason";
import { mobilitySection } from "./types/mobility";
import { offseasonSection } from "./types/offseason";
import { recoverySection } from "./types/recovery";

export const OTHER_SECTION_CONFIGS: OtherSectionConfig[] = [
  mobilitySection,
  recoverySection,
  inseasonSection,
  offseasonSection,
  educationSection,
];

export function getOtherSectionConfig(type: string): OtherSectionConfig | null {
  return OTHER_SECTION_CONFIGS.find((item) => item.type === type) ?? null;
}

export function isOtherSectionType(value: string): value is OtherSectionType {
  return OTHER_SECTION_CONFIGS.some((item) => item.type === value);
}
