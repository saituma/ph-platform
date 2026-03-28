import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import http from "http";

export function startServer() {
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
