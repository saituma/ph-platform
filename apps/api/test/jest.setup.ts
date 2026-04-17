process.env.NODE_ENV = process.env.NODE_ENV || "test";

/** Ensure required env passes zod even when CI exports empty strings for secrets. */
function ensureEnv(key: string, value: string) {
  if (!process.env[key]?.trim()) {
    process.env[key] = value;
  }
}

ensureEnv("JWT_SECRET", "test-jwt-secret");
ensureEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/test");
ensureEnv("STRIPE_SECRET_KEY", "sk_test_123");
ensureEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
ensureEnv("STRIPE_SUCCESS_URL", "http://localhost:3000/stripe/success");
ensureEnv("STRIPE_CANCEL_URL", "http://localhost:3000/stripe/cancel");
ensureEnv("OPEN_AI_API_KEY", "test-openai");
ensureEnv("ADMIN_WEB_URL", "http://localhost:3000");

jest.mock("expo-server-sdk", () => {
  class ExpoMock {
    static isExpoPushToken() {
      return false;
    }

    sendPushNotificationsAsync = jest.fn(async () => [{ status: "ok", id: "test-receipt" }]);
  }
  return { __esModule: true, default: ExpoMock, Expo: ExpoMock };
});
