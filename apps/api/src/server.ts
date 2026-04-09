import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import http from "http";
import { runMigrations } from "./db/migrations";

export async function startServer() {
  if (env.runMigrationsOnStartup) {
    try {
      console.log("[Startup] Running database migrations...");
      await runMigrations({ databaseUrl: env.databaseUrl });
      console.log("[Startup] Database migrations complete.");
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
          : String(error);
      console.error(`[Startup] Database migrations failed.\n${message}`);
      if (env.nodeEnv === "production") {
        throw error;
      }
    }
  }

  if (env.nodeEnv === "production" && !env.expoAccessToken?.trim()) {
    console.warn(
      "[Startup] EXPO_ACCESS_TOKEN is not set. Remote push to mobile clients will fail until it is configured (Expo dashboard → Access tokens; see DEPLOY.md).",
    );
  }

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.port, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.port} and binding to 0.0.0.0`);
  });
}
