import { SignJWT, importPKCS8 } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { adminSettingsTable } from "../db/schema";

type UpsertCalendarEventInput = {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  existingEventId?: string | null;
};

type GoogleCalendarConfig = {
  calendarId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(privateKeyRaw: string) {
  return privateKeyRaw.replace(/\\n/g, "\n");
}

function getGoogleCalendarConfigFromEnv(): GoogleCalendarConfig | null {
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!calendarId || !clientEmail || !privateKeyRaw) return null;
  return { calendarId, clientEmail, privateKey: normalizePrivateKey(privateKeyRaw) };
}

export async function getGoogleCalendarConnectionForAdmin(userId: number) {
  const [row] = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.userId, userId))
    .limit(1);
  const calendarId = row?.googleCalendarId?.trim();
  const clientEmail = row?.googleServiceAccountEmail?.trim();
  const privateKeyRaw = row?.googleServiceAccountPrivateKey?.trim();
  if (!calendarId || !clientEmail || !privateKeyRaw) return null;
  return {
    calendarId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
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

async function getAccessToken(clientEmail: string, privateKey: string) {
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

export async function testGoogleCalendarConnection(config: GoogleCalendarConfig) {
  const accessToken = await getAccessToken(config.clientEmail, normalizePrivateKey(config.privateKey));
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
  const accessToken = await getAccessToken(cfg.clientEmail, cfg.privateKey);

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

  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_EVENT_UPSERT_FAILED: ${text}`);
  }
  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}
