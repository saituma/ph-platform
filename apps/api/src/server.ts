import { createApp } from "./app";
import { env } from "./config/env";
import { setApiReady } from "./config/readiness";
import { initSocket } from "./socket";
import http from "http";
import { runMigrations } from "./db/migrations";
import { fatalExit } from "./lib/fatal-exit";

export async function startServer() {
  if (env.runMigrationsOnStartup) setApiReady(false);

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

  if (env.runMigrationsOnStartup) {
    (async () => {
      try {
        const target = (() => {
          try {
            const u = new URL(env.databaseUrl);
            return {
              host: u.hostname || "(unknown)",
              port: u.port || undefined,
              database: (u.pathname || "").replace(/^\//, "") || undefined,
            };
          } catch {
            return { host: "(unparsed)", port: undefined as string | undefined, database: undefined as string | undefined };
          }
        })();
        console.log(
          `[Startup] Running database migrations (cwd=${process.cwd()}, host=${target.host}${target.port ? `:${target.port}` : ""}${target.database ? `/${target.database}` : ""})...`,
        );
        await runMigrations({ databaseUrl: env.databaseUrl });
        console.log("[Startup] Database migrations complete.");
        setApiReady(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
            : String(error);
        console.error(`[Startup] Database migrations failed.\n${message}`);
        if (env.nodeEnv === "production") {
          fatalExit("Database migrations failed during startup", error, 1);
        }
      }
    })();
  }
}
