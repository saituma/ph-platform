import { createApp } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";
import http from "http";

export function startServer() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
  });
}
