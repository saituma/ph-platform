import admin from "firebase-admin";

import { env } from "../config/env";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function looksLikeJson(value: string) {
  const s = value.trim();
  return s.startsWith("{") && s.endsWith("}");
}

function tryParseServiceAccountJson(raw: string): FirebaseServiceAccount | null {
  const value = raw.trim();
  if (!value) return null;

  const candidates: string[] = [];
  candidates.push(value);

  // Some deploys prefer base64 to avoid newline escaping issues.
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8").trim();
    if (looksLikeJson(decoded)) candidates.push(decoded);
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    if (!looksLikeJson(candidate)) continue;
    try {
      const parsed = JSON.parse(candidate) as Partial<FirebaseServiceAccount>;
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) continue;
      return {
        project_id: parsed.project_id,
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    } catch {
      // ignore
    }
  }
  return null;
}

let initialized = false;

function ensureFirebaseInitialized() {
  if (initialized) return;

  const creds = tryParseServiceAccountJson(env.firebaseServiceAccountJson);
  if (!creds) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON or base64 JSON).",
    );
  }

  // Avoid double-init in dev/hot reload.
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(creds as any),
      projectId: creds.project_id,
    });
  }

  initialized = true;
}

export type SendFcmPushInput = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  android?: {
    channelId?: string;
    priority?: "normal" | "high";
  };
};

export async function sendFcmPush(input: SendFcmPushInput) {
  ensureFirebaseInitialized();

  return admin.messaging().send({
    token: input.token,
    notification: { title: input.title, body: input.body },
    data: input.data,
    android: {
      priority: input.android?.priority ?? "high",
      notification: input.android?.channelId
        ? { channelId: input.android.channelId }
        : undefined,
    },
  });
}

export function isFcmEnabled() {
  return Boolean(env.firebaseServiceAccountJson?.trim());
}

export function isFcmTokenError(err: unknown) {
  const code = (err as any)?.code ?? (err as any)?.errorInfo?.code;
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token"
  );
}

