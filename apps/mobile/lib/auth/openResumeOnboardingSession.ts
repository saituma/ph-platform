import * as WebBrowser from "expo-web-browser";
import { REGISTER_REDIRECT_URI, type RegisterSessionResult } from "./openRegisterSession";

const ONBOARDING_BASE_URL =
  process.env.EXPO_PUBLIC_ONBOARDING_URL?.replace(/\/$/, "") ?? "";

/**
 * Opens the PH Performance onboarding website inside an in-app auth browser session
 * so an athlete with an incomplete onboarding can finish it without leaving the app.
 * The mobile JWT is passed as ?token= so the site can authenticate the ephemeral
 * browser session via the existing /auth/handoff route.
 *
 * Closes automatically when the onboarding success page redirects to the
 * phperformance://auth/registered deep link (same URI monitored by openRegisterSession).
 */
export async function openResumeOnboardingSession({
  token,
}: {
  token: string;
}): Promise<RegisterSessionResult> {
  if (!ONBOARDING_BASE_URL) {
    return { status: "error", message: "Onboarding URL is not configured." };
  }

  const startUrl = `${ONBOARDING_BASE_URL}/auth/handoff?token=${encodeURIComponent(token)}&from_mobile=1`;

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      startUrl,
      REGISTER_REDIRECT_URI,
    );
    switch (result.type) {
      case "success":
        return { status: "submitted" };
      case "cancel":
      case "dismiss":
        return { status: "dismissed" };
      default:
        return { status: "dismissed" };
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not open onboarding";
    return { status: "error", message };
  }
}
