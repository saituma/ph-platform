import { isApiReady } from "../config/readiness";

export function getHealthStatus() {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    ready: isApiReady(),
  };
}
