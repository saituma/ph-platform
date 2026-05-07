import { monitorEventLoopDelay } from "node:perf_hooks";

import { createLogger } from "./logger";

const log = createLogger({ component: "event-loop-delay" });

export function startEventLoopDelayLogging() {
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();

  const timer = setInterval(() => {
    const meanMs = Math.round(histogram.mean / 1_000_000);
    const maxMs = Math.round(histogram.max / 1_000_000);
    const p95Ms = Math.round(histogram.percentile(95) / 1_000_000);
    const p99Ms = Math.round(histogram.percentile(99) / 1_000_000);

    if (maxMs >= 250 || p95Ms >= 100) {
      log.warn({ meanMs, p95Ms, p99Ms, maxMs }, "Event loop delay high");
    } else {
      log.info({ meanMs, p95Ms, p99Ms, maxMs }, "Event loop delay");
    }
    histogram.reset();
  }, 30_000);

  return () => {
    clearInterval(timer);
    histogram.disable();
  };
}
