import { apiRequest } from "@/lib/api";
import { PlanDetail, TrainingContentV2Workspace, ProgramSectionContent } from "@/types/programs";

export async function fetchPublicPlans(forceRefresh = true) {
  return apiRequest<{ plans: PlanDetail[] }>("/public/plans", { forceRefresh });
}

export async function fetchTeamWorkspace(token: string, age: number | null, forceRefresh = false) {
  const ageQ = age != null ? `?age=${age}` : "";
  return apiRequest<TrainingContentV2Workspace>(
    `/training-content-v2/mobile${ageQ}`,
    { token, forceRefresh }
  );
}

export async function fetchPhpPlusTabs() {
  return apiRequest<{ tabs?: string[] }>(
    `/onboarding/php-plus-tabs?ts=${Date.now()}`,
    { method: "GET", suppressLog: true }
  );
}

export async function fetchSectionContent(token: string, type: string, tier: string, age: number | null, forceRefresh = false) {
  const ageQ = age !== null ? `&age=${age}` : "";
  return apiRequest<{ items: ProgramSectionContent[] }>(
    `/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
    { token, forceRefresh }
  );
}
