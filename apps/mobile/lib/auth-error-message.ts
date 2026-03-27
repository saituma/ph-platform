type AuthErrorFlow =
  | "login"
  | "register"
  | "forgot"
  | "verify"
  | "resend"
  | "reset-password"
  | "change-password";

export function extractAuthErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export function getFriendlyAuthErrorMessage(
  error: unknown,
  flow: AuthErrorFlow
): string {
  const raw = extractAuthErrorMessage(error).trim();
  const message = raw.toLowerCase();

  if (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("cannot reach api at")
  ) {
    const reachMatch = raw.match(/Cannot reach API at\s+(https?:\/\/\S+)\./i);
    if (reachMatch?.[1]) {
      try {
        const host = new URL(reachMatch[1]).host;
        return `We couldn't reach the server (${host}). Please check your connection and try again.`;
      } catch {
        // ignore invalid URL
      }
    }
    return "We couldn't reach the server. Please check your connection and try again.";
  }

  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "You've tried a few times already. Please wait a moment and try again.";
  }

  if (flow === "login") {
    if (
      message.includes("invalid") ||
      message.includes("incorrect") ||
      message.includes("unauthorized") ||
      message.includes("not authorized") ||
      message.includes("user not found") ||
      message.includes("password")
    ) {
      return "Your email or password doesn't look right. Please try again.";
    }
    return "We couldn't sign you in right now. Please try again.";
  }

  if (flow === "register") {
    if (
      message.includes("already exists") ||
      message.includes("already registered") ||
      message.includes("already in use") ||
      message.includes("username exists")
    ) {
      return "That email is already in use. Try signing in instead.";
    }
    if (message.includes("password")) {
      return "Please choose a stronger password and try again.";
    }
    return "We couldn't create your account right now. Please try again.";
  }

  if (flow === "forgot") {
    return "We couldn't send a reset code right now. Please try again in a moment.";
  }

  if (flow === "verify") {
    if (
      message.includes("code") ||
      message.includes("expired") ||
      message.includes("mismatch") ||
      message.includes("invalid")
    ) {
      return "That verification code doesn't look right. Please check it and try again.";
    }
    return "We couldn't verify your account right now. Please try again.";
  }

  if (flow === "resend") {
    return "We couldn't resend the code right now. Please wait a moment and try again.";
  }

  if (flow === "reset-password") {
    if (
      message.includes("code") ||
      message.includes("expired") ||
      message.includes("mismatch") ||
      message.includes("invalid")
    ) {
      return "That reset code doesn't look right. Please check it and try again.";
    }
    if (message.includes("password")) {
      return "Please choose a stronger password and try again.";
    }
    return "We couldn't reset your password right now. Please try again.";
  }

  if (flow === "change-password") {
    if (
      message.includes("incorrect") ||
      message.includes("not authorized") ||
      message.includes("invalid old password") ||
      message.includes("old password")
    ) {
      return "Your current password doesn't look right. Please try again.";
    }
    if (message.includes("password")) {
      return "Please review your new password and try again.";
    }
    return "We couldn't update your password right now. Please try again.";
  }

  return "Something went wrong. Please try again.";
}
