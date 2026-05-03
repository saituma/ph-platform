import { config } from "@/lib/config";
import { getClientAuthToken } from "@/lib/client-storage";

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

export async function fetchPrograms(_token?: string): Promise<{ items: Program[] }> {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();

  const response = await fetch(`${baseUrl}/api/program-section-content`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch programs: ${response.status}`);
  }

  const data = await response.json();
  return { items: data.items || [] };
}

export async function fetchTeamWorkspace(_token: string, age: number | null): Promise<TrainingContentV2Workspace> {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const ageQ = age != null ? `?age=${age}` : "";

  const response = await fetch(`${baseUrl}/api/training-content-v2/mobile${ageQ}`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workspace: ${response.status}`);
  }

  return response.json();
}

export async function fetchSectionContent(_token: string, type: string, tier: string, age: number | null) {
  const baseUrl = config.api.baseUrl;
  const ageQ = age !== null ? `&age=${age}` : "";

  const token = getClientAuthToken();
  const response = await fetch(
    `${baseUrl}/api/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
    {
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch section content: ${response.status}`);
  }

  return response.json();
}

export interface AssignedProgram {
  id: number;
  name: string;
  description: string | null;
  moduleCount: number;
  status: string;
}

export async function fetchMyAssignedPrograms(_token?: string): Promise<AssignedProgram[]> {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/programs/my-assigned`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch assigned programs: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data.programs) ? data.programs : [];
}

export async function fetchMyProgramFull(_token: string, programId: number) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/programs/my-assigned/${programId}`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch program: ${response.status}`);
  }
  const data = await response.json();
  return data.program ?? null;
}

export async function fetchMySessionExercises(_token: string, sessionId: number) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/programs/my-sessions/${sessionId}/exercises`, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch session exercises: ${response.status}`);
  }
  return response.json();
}

export async function presignVideoUpload(file: File) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/media/presign`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      folder: "training-videos",
      fileName: file.name,
      contentType: file.type || "video/mp4",
      sizeBytes: file.size,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to prepare upload");
  }
  return response.json() as Promise<{ uploadUrl: string; publicUrl: string; key: string }>;
}

export async function createAthleteVideo(videoUrl: string, notes?: string) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/videos`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ videoUrl, notes }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save video");
  }
  return response.json();
}

export async function completeSession(
  _token: string,
  sessionId: number,
  feedback?: { weightsUsed?: string; repsCompleted?: string; rpe?: number },
) {
  const baseUrl = config.api.baseUrl;
  const token = getClientAuthToken();
  const response = await fetch(
    `${baseUrl}/api/training-content-v2/mobile/workouts/${sessionId}/complete`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(feedback ?? {}),
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to complete session");
  }
  return response.json();
}

export async function fetchProgramDetail(_token: string, programId: number): Promise<Program> {
  const baseUrl = config.api.baseUrl;

  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/programs/${programId}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch program: ${response.status}`);
  }

  return response.json();
}
