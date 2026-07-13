import { performance } from "node:perf_hooks";

import { createLogger } from "./logger";

const log = createLogger({ component: "realtime-latency" });

export type RealtimeTrace = {
  traceId: string;
  clientSentAt?: number | null;
  startedAt: number;
};

export function createRealtimeTrace(input?: {
  traceId?: string | null;
  clientSentAt?: number | string | null;
}): RealtimeTrace {
  return {
    traceId: input?.traceId?.trim() || `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clientSentAt: normalizeClientSentAt(input?.clientSentAt),
    startedAt: performance.now(),
  };
}

export function logRealtimeLatency(
  trace: RealtimeTrace | undefined,
  stage: string,
  data: Record<string, unknown> = {},
) {
  if (!trace) return;
  const now = performance.now();
  const serverElapsedMs = Math.round(now - trace.startedAt);
  const clientToServerElapsedMs =
    typeof trace.clientSentAt === "number" ? Math.round(Date.now() - trace.clientSentAt) : undefined;
  // debug, not info: every message emits three of these checkpoints, so at the default
  // LOG_LEVEL=info each send wrote three JSON lines to Heroku Logplex forever. Nothing
  // aggregates them — there is no metrics backend reading these. Raise LOG_LEVEL=debug
  // when you actually want to trace latency.
  log.debug(
    {
      traceId: trace.traceId,
      stage,
      serverElapsedMs,
      clientToServerElapsedMs,
      ...data,
    },
    "Realtime latency checkpoint",
  );
}

function normalizeClientSentAt(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
