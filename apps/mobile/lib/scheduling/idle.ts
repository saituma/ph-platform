export type IdleTask = {
  cancel?: () => void;
};

type RequestIdleCallbackHandle = number;

type RequestIdleCallbackOptions = {
  timeout?: number;
};

type RequestIdleCallback = (
  callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
  options?: RequestIdleCallbackOptions,
) => RequestIdleCallbackHandle;

type CancelIdleCallback = (handle: RequestIdleCallbackHandle) => void;

function getRequestIdleCallback(): RequestIdleCallback | null {
  return (globalThis as any).requestIdleCallback ?? null;
}

function getCancelIdleCallback(): CancelIdleCallback | null {
  return (globalThis as any).cancelIdleCallback ?? null;
}

export function runWhenIdle(fn: () => void, options?: { timeoutMs?: number }): IdleTask {
  const requestIdleCallback = getRequestIdleCallback();
  const cancelIdleCallback = getCancelIdleCallback();

  if (requestIdleCallback && cancelIdleCallback) {
    const handle = requestIdleCallback(
      () => {
        fn();
      },
      options?.timeoutMs ? { timeout: options.timeoutMs } : undefined,
    );
    return { cancel: () => cancelIdleCallback(handle) };
  }

  const timeoutHandle = setTimeout(fn, 0);
  return { cancel: () => clearTimeout(timeoutHandle) };
}

export function waitForIdle(options?: { timeoutMs?: number }): Promise<void> {
  return new Promise((resolve) => {
    runWhenIdle(resolve, options);
  });
}
