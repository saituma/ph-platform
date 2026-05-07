import { createLogger } from "./logger";

const log = createLogger({ component: "background-task" });

export function runBestEffortBackgroundTask(
  name: string,
  context: Record<string, unknown>,
  task: () => Promise<void>,
) {
  setImmediate(() => {
    void Promise.resolve()
      .then(task)
      .catch((error) => {
        log.error({ err: error, task: name, ...context }, "Best-effort background task failed");
      });
  });
}
