import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import http from "http";

export function startServer() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.port, "0.0.0.0", () => {
    console.log(`Server is running on port ${env.port} and binding to 0.0.0.0`);
  });
}
