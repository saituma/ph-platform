import * as WebBrowser from "expo-web-browser";

const REGISTER_URL = "https://phperformance.uk/register";

/**
 * Deep-link URI that ASWebAuthenticationSession (iOS) / Chrome Custom Tab (Android)
 * monitors for. When the web registration flow reaches /onboarding/success it redirects
 * here, which auto-closes the in-app browser session and returns control to the app.
 */
export const REGISTER_REDIRECT_URI = "phperformance://auth/registered";

export type RegisterSessionResult =
  | { status: "submitted" }
  | { status: "dismissed" }
  | { status: "error"; message: string };

/**
 * Opens the PH Performance web registration flow inside an in-app auth browser session
 * (SFAuthenticationSession / ASWebAuthenticationSession on iOS, Chrome Custom Tab on Android).
 *
 * Unlike openBrowserAsync, this session watches for a redirect to REGISTER_REDIRECT_URI
 * and resolves automatically when the user completes (or closes) the registration flow.
 */
export async function openRegisterSession(): Promise<RegisterSessionResult> {
  const startUrl = `${REGISTER_URL}?from_mobile=1`;
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
      err instanceof Error ? err.message : "Could not open registration";
    return { status: "error", message };
  }
}
