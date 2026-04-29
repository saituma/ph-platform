function normalizeServerUrl(raw?: string) {
  const fallback = 'http://localhost:3001/api'
  if (!raw || !raw.trim()) return fallback
  const trimmed = raw.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const SERVER_URL = normalizeServerUrl(import.meta.env.VITE_SERVER_URL);

export async function apiClient(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

export type SuperAdminStats = {
  users: number;
  athletes: number;
  teams: number;
  activeSubscriptions: number;
};

export type AppUser = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  isBlocked?: boolean;
  isDeleted?: boolean;
  athleteName?: string | null;
  athleteTeam?: string | null;
  programTier?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LocationRow = {
  id: number;
  userId: number;
  name: string | null;
  email: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  createdAt: string;
};

export type AuditRow = {
  id: number;
  action: string;
  targetTable: string | null;
  targetId: number | null;
  createdAt: string;
  performerName: string | null;
  performerEmail: string | null;
};

export type TeamRow = {
  id: number;
  team: string;
  memberCount: number;
  youthCount: number;
  adultCount: number;
  guardianCount?: number;
  createdAt: string;
  updatedAt: string;
};

export async function getSuperAdminStats() {
  return apiClient('/super-admin/stats') as Promise<SuperAdminStats>;
}

export async function getUsers(limit = 200, q = '') {
  const query = new URLSearchParams();
  query.set('limit', String(limit));
  if (q.trim()) query.set('q', q.trim());
  const path = `/admin/users${query.toString() ? `?${query.toString()}` : ''}`;
  const data = await apiClient(path);
  return (data?.users || []) as AppUser[];
}

export async function getLocations(days = 7) {
  const query = new URLSearchParams();
  query.set('days', String(days));
  const data = await apiClient(`/admin/user-locations?${query.toString()}`);
  return (data?.latest || []) as LocationRow[];
}

export async function getSuperAdminAuditLogs() {
  return apiClient('/super-admin/audit-logs') as Promise<AuditRow[]>;
}

export async function getTeams() {
  const data = await apiClient('/admin/teams');
  return (data?.teams || []) as TeamRow[];
}

export async function setUserRole(userId: number, role: string) {
  return apiClient(`/super-admin/users/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export async function setUserBlocked(userId: number, blocked: boolean) {
  return apiClient(`/admin/users/${userId}/block`, {
    method: 'POST',
    body: JSON.stringify({ blocked }),
  });
}

export async function deleteUser(userId: number) {
  return apiClient(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function trackSuperAdminEvent(event: string, page: string, targetId?: number) {
  return apiClient('/super-admin/events', {
    method: 'POST',
    body: JSON.stringify({
      event,
      page,
      targetId: typeof targetId === 'number' ? targetId : null,
    }),
  });
}
