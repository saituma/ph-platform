process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/test";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";
process.env.STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL ?? "http://localhost:3000/stripe/success";
process.env.STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL ?? "http://localhost:3000/stripe/cancel";
process.env.OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY ?? "test-openai";
process.env.ADMIN_WEB_URL = process.env.ADMIN_WEB_URL ?? "http://localhost:3000";

jest.mock("expo-server-sdk", () => {
  class ExpoMock {
    static isExpoPushToken() {
      return false;
    }

    sendPushNotificationsAsync = jest.fn(async () => [{ status: "ok", id: "test-receipt" }]);
  }
  return { __esModule: true, default: ExpoMock, Expo: ExpoMock };
});
