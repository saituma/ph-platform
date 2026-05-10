import { SignJWT, importPKCS8, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { adminSettingsTable } from "../db/schema";
import { env } from "../config/env";

// In-memory token cache to avoid hitting Google's token endpoint on every operation
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const TOKEN_CACHE_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

function getTokenCacheKey(config: GoogleCalendarConfig): string {
  if (config.mode === "oauth") return `oauth:${config.refreshToken.slice(0, 16)}`;
  return `sa:${config.clientEmail}`;
}

function clearTokenCacheForConfig(config: GoogleCalendarConfig): void {
  tokenCache.delete(getTokenCacheKey(config));
}

type UpsertCalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  existingEventId?: string | null;
};

type ServiceAccountConfig = {
  mode: "service_account";
  calendarId: string;
  clientEmail: string;
  privateKey: string;
  connectedAt?: Date | null;
};

type OAuthConfig = {
  mode: "oauth";
  calendarId: string;
  accountEmail: string;
  refreshToken: string;
  connectedAt?: Date | null;
};

export type GoogleCalendarConfig = ServiceAccountConfig | OAuthConfig;

type OAuthState = {
  purpose: "google_calendar_oauth";
  userId: number;
};

function normalizePrivateKey(privateKeyRaw: string) {
  return privateKeyRaw.replace(/\\n/g, "\n");
}

function getOAuthConfigFromEnv() {
  const clientId = env.googleOAuthClientId;
  const clientSecret = env.googleOAuthClientSecret;
  return { clientId, clientSecret };
}

function getApiBaseUrl() {
  const fromEnv = (env.publicApiBaseUrl || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return `http://localhost:${env.port}`;
}

function getOAuthRedirectUri() {
  return `${getApiBaseUrl()}/api/google-calendar/oauth/callback`;
}

function isLikelyServiceAccountKey(value: string) {
  return value.includes("BEGIN PRIVATE KEY") || value.includes("BEGIN RSA PRIVATE KEY");
}

function getGoogleCalendarConfigFromEnv(): ServiceAccountConfig | null {
  const calendarId = env.googleCalendarId;
  const clientEmail = env.googleServiceAccountEmail;
  const privateKeyRaw = env.googleServiceAccountPrivateKey;
  if (!calendarId || !clientEmail || !privateKeyRaw) return null;
  return { mode: "service_account", calendarId, clientEmail, privateKey: normalizePrivateKey(privateKeyRaw) };
}

async function signOAuthState(userId: number) {
  const secret = new TextEncoder().encode(env.jwtSecret);
  return await new SignJWT({ purpose: "google_calendar_oauth", userId } satisfies OAuthState)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

async function verifyOAuthState(token: string) {
  const secret = new TextEncoder().encode(env.jwtSecret);
  const { payload } = await jwtVerify(token, secret);
  if (payload.purpose !== "google_calendar_oauth") throw new Error("GOOGLE_OAUTH_STATE_INVALID");
  const userId = Number(payload.userId);
  if (!Number.isFinite(userId) || userId < 1) throw new Error("GOOGLE_OAUTH_STATE_INVALID_USER");
  return userId;
}

async function exchangeOAuthCode(code: string) {
  const { clientId, clientSecret } = getOAuthConfigFromEnv();
  if (!clientId || !clientSecret) throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getOAuthRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_OAUTH_TOKEN_FAILED: ${text}`);
  }
  return (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };
}

async function refreshOAuthAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getOAuthConfigFromEnv();
  if (!clientId || !clientSecret) throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_OAUTH_REFRESH_FAILED: ${text}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("GOOGLE_OAUTH_ACCESS_TOKEN_EMPTY");
  return json.access_token;
}

async function getOAuthProfileEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_OAUTH_PROFILE_FAILED: ${text}`);
  }
  const json = (await res.json()) as { email?: string };
  return (json.email || "").trim();
}

export async function getGoogleOAuthStartUrlForAdmin(userId: number) {
  const { clientId } = getOAuthConfigFromEnv();
  if (!clientId) throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  const state = await signOAuthState(userId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" "),
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function completeGoogleOAuthConnection(input: { code: string; state: string }): Promise<{ userId: number }> {
  const userId = await verifyOAuthState(input.state);
  const tokenData = await exchangeOAuthCode(input.code);
  const refreshToken = (tokenData.refresh_token || "").trim();
  const accessToken = (tokenData.access_token || "").trim();
  if (!refreshToken) {
    throw new Error("GOOGLE_OAUTH_REFRESH_TOKEN_EMPTY");
  }
  if (!accessToken) {
    throw new Error("GOOGLE_OAUTH_ACCESS_TOKEN_EMPTY");
  }
  const email = await getOAuthProfileEmail(accessToken);
  await db
    .insert(adminSettingsTable)
    .values({
      userId,
      googleCalendarId: "primary",
      googleServiceAccountEmail: email || null,
      googleServiceAccountPrivateKey: refreshToken,
      googleCalendarConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminSettingsTable.userId,
      set: {
        googleCalendarId: "primary",
        googleServiceAccountEmail: email || null,
        googleServiceAccountPrivateKey: refreshToken,
        googleCalendarConnectedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  return { userId };
}

export async function listGoogleCalendarsForAdmin(userId: number) {
  const config = await getGoogleCalendarConnectionForAdmin(userId);
  if (!config || config.mode !== "oauth") return [] as Array<{ id: string; summary: string; primary: boolean }>;
  const accessToken = await refreshOAuthAccessToken(config.refreshToken);
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_CALENDAR_LIST_FAILED: ${text}`);
  }
  const json = (await res.json()) as { items?: Array<{ id?: string; summary?: string; primary?: boolean }> };
  const items = Array.isArray(json.items) ? json.items : [];
  return items
    .map((item) => ({
      id: String(item.id || "").trim(),
      summary: String(item.summary || item.id || "Calendar").trim(),
      primary: Boolean(item.primary),
    }))
    .filter((item) => item.id.length > 0);
}

export async function selectGoogleCalendarForAdmin(userId: number, calendarId: string) {
  const cleanId = calendarId.trim();
  if (!cleanId) throw new Error("GOOGLE_CALENDAR_ID_REQUIRED");
  await db
    .insert(adminSettingsTable)
    .values({ userId, googleCalendarId: cleanId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: adminSettingsTable.userId,
      set: {
        googleCalendarId: cleanId,
        updatedAt: new Date(),
      },
    });
}

export async function getGoogleCalendarConnectionForAdmin(userId: number) {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.userId, userId))
    .limit(1);
  const calendarId = row?.googleCalendarId?.trim();
  const email = row?.googleServiceAccountEmail?.trim();
  const storedSecret = row?.googleServiceAccountPrivateKey?.trim();
  if (!calendarId || !storedSecret) return null;
  if (isLikelyServiceAccountKey(storedSecret) && email) {
    return {
      mode: "service_account" as const,
      calendarId,
      clientEmail: email,
      privateKey: normalizePrivateKey(storedSecret),
      connectedAt: row?.googleCalendarConnectedAt ?? null,
    };
  }
  return {
    mode: "oauth" as const,
    calendarId,
    accountEmail: email || "",
    refreshToken: storedSecret,
    connectedAt: row?.googleCalendarConnectedAt ?? null,
  };
}

export async function saveGoogleCalendarConnectionForAdmin(
  userId: number,
  input: { calendarId: string; serviceAccountEmail: string; privateKey: string },
) {
  const calendarId = input.calendarId.trim();
  const serviceAccountEmail = input.serviceAccountEmail.trim();
  const privateKey = input.privateKey.trim();
  await testGoogleCalendarConnection({
    mode: "service_account",
    calendarId,
    clientEmail: serviceAccountEmail,
    privateKey,
  });
  await db
    .insert(adminSettingsTable)
    .values({
      userId,
      googleCalendarId: calendarId,
      googleServiceAccountEmail: serviceAccountEmail,
      googleServiceAccountPrivateKey: privateKey,
      googleCalendarConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminSettingsTable.userId,
      set: {
        googleCalendarId: calendarId,
        googleServiceAccountEmail: serviceAccountEmail,
        googleServiceAccountPrivateKey: privateKey,
        googleCalendarConnectedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function disconnectGoogleCalendarConnectionForAdmin(userId: number) {
  await db
    .insert(adminSettingsTable)
    .values({ userId })
    .onConflictDoNothing({ target: adminSettingsTable.userId });
  await db
    .update(adminSettingsTable)
    .set({
      googleCalendarId: null,
      googleServiceAccountEmail: null,
      googleServiceAccountPrivateKey: null,
      googleCalendarConnectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.userId, userId));
}

async function getAccessTokenForServiceAccount(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(privateKey, "RS256");
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_TOKEN_FAILED: ${text}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("GOOGLE_TOKEN_EMPTY");
  return json.access_token;
}

async function getCalendarAccessToken(config: GoogleCalendarConfig) {
  const cacheKey = getTokenCacheKey(config);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt - TOKEN_CACHE_BUFFER_MS > Date.now()) {
    return cached.token;
  }

  let token: string;
  if (config.mode === "oauth") {
    token = await refreshOAuthAccessToken(config.refreshToken);
  } else {
    token = await getAccessTokenForServiceAccount(config.clientEmail, normalizePrivateKey(config.privateKey));
  }

  // Cache with ~1 hour TTL (Google tokens typically expire in 3600s)
  tokenCache.set(cacheKey, { token, expiresAt: Date.now() + 3600 * 1000 });
  return token;
}

export async function testGoogleCalendarConnection(config: GoogleCalendarConfig) {
  const accessToken = await getCalendarAccessToken(config);
  const path = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}`;
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_CALENDAR_TEST_FAILED: ${text}`);
  }
}

export async function upsertGoogleCalendarEvent(
  input: UpsertCalendarEventInput,
  configOverride?: GoogleCalendarConfig | null,
) {
  const cfg = configOverride ?? getGoogleCalendarConfigFromEnv();
  if (!cfg) return null;
  const accessToken = await getCalendarAccessToken(cfg);

  const payload = {
    summary: input.title,
    description: input.description ?? undefined,
    location: input.location ?? undefined,
    start: { dateTime: input.startsAt.toISOString(), timeZone: "UTC" },
    end: { dateTime: input.endsAt.toISOString(), timeZone: "UTC" },
  };

  const method = input.existingEventId ? "PATCH" : "POST";
  const path = input.existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events/${encodeURIComponent(input.existingEventId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events`;

  let res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Auth revoked — clear cached token and throw specific error
  if (res.status === 401 || res.status === 403) {
    clearTokenCacheForConfig(cfg);
    const text = await res.text();
    throw new Error(`GOOGLE_AUTH_REVOKED: ${text}`);
  }

  // Event was deleted externally — fall back to creating a new one
  if (res.status === 404 && method === "PATCH") {
    const createPath = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.calendarId)}/events`;
    res = await fetch(createPath, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_EVENT_UPSERT_FAILED: ${text}`);
  }
  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}

export async function deleteGoogleCalendarEvent(
  eventId: string,
  config: GoogleCalendarConfig,
): Promise<void> {
  const accessToken = await getCalendarAccessToken(config);
  const path = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}`;
  const res = await fetch(path, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) {
    clearTokenCacheForConfig(config);
    throw new Error("GOOGLE_AUTH_REVOKED");
  }
  // 404/410 means already deleted — treat as success
  if (res.status === 404 || res.status === 410) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_EVENT_DELETE_FAILED: ${text}`);
  }
}

export type GoogleCalendarEvent = {
  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  htmlLink: string | null;
  status: string;
};

export async function listGoogleCalendarEvents(
  config: GoogleCalendarConfig,
  timeMin: string,
  timeMax: string,
  maxResults = 250,
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getCalendarAccessToken(config);

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401 || res.status === 403) {
    clearTokenCacheForConfig(config);
    const text = await res.text();
    throw new Error(`GOOGLE_AUTH_REVOKED: ${text}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_CALENDAR_LIST_EVENTS_FAILED: ${text}`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      id?: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      htmlLink?: string;
      status?: string;
    }>;
  };

  const items = Array.isArray(json.items) ? json.items : [];

  return items
    .filter((item) => item.status !== "cancelled")
    .map((item) => {
      const isAllDay = !item.start?.dateTime;
      const startsAt = item.start?.dateTime || item.start?.date || "";
      const endsAt = item.end?.dateTime || item.end?.date || "";
      return {
        id: item.id || "",
        summary: item.summary || null,
        description: item.description || null,
        location: item.location || null,
        startsAt,
        endsAt,
        isAllDay,
        htmlLink: item.htmlLink || null,
        status: item.status || "confirmed",
      };
    })
    .filter((item) => item.id.length > 0);
}

export async function isGoogleCalendarHealthy(userId: number): Promise<boolean> {
  try {
    const config = await getGoogleCalendarConnectionForAdmin(userId);
    if (!config) return false;
    await testGoogleCalendarConnection(config);
    return true;
  } catch {
    return false;
  }
}
