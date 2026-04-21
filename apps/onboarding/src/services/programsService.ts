import { env } from "@/env";

export interface Program {
  id: number;
  title: string;
  body: string;
  videoUrl?: string | null;
  completed?: boolean;
  metadata?: any;
}

export interface ProgramSection {
  type: string;
  label: string;
  items: any[];
}

export interface TrainingContentV2Workspace {
  age: number | null;
  tabs: string[];
  modules: any[];
  others: { type: string; label: string; items: any[] }[];
}

export async function fetchPrograms(token: string): Promise<{ items: Program[] }> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  
  const response = await fetch(`${baseUrl}/api/program-section-content`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch programs: ${response.status}`);
  }

  const data = await response.json();
  return { items: data.items || [] };
}

export async function fetchTeamWorkspace(token: string, age: number | null): Promise<TrainingContentV2Workspace> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  const ageQ = age != null ? `?age=${age}` : "";
  
  const response = await fetch(`${baseUrl}/api/training-content-v2/mobile${ageQ}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workspace: ${response.status}`);
  }

  return response.json();
}

export async function fetchSectionContent(token: string, type: string, tier: string, age: number | null) {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  const ageQ = age !== null ? `&age=${age}` : "";
  
  const response = await fetch(
    `${baseUrl}/api/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch section content: ${response.status}`);
  }

  return response.json();
}

export async function fetchProgramDetail(token: string, programId: number): Promise<Program> {
  const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
  
  const response = await fetch(`${baseUrl}/api/programs/${programId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch program: ${response.status}`);
  }

  return response.json();
}
