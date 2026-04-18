import { useRef } from "react";

let installed = false;

function isMaxDepthMessage(flat: string): boolean {
  return /maximum update depth/i.test(flat);
}

function logDepthProbeArg(tag: string, index: number, arg: unknown): void {
  if (arg instanceof Error) {
    console.warn(`${tag} arg[${index}] name=${arg.name} message=${arg.message}`);
    if (arg.stack) {
      console.warn(`${tag} arg[${index}] .stack:\n${arg.stack}`);
    }
    const cs = (arg as Error & { componentStack?: string }).componentStack;
    if (typeof cs === "string" && cs.length > 0) {
      console.warn(`${tag} arg[${index}] .componentStack (best hint):\n${cs}`);
    }
    return;
  }
  if (arg != null && typeof arg === "object") {
    const o = arg as Record<string, unknown>;
    if (typeof o.componentStack === "string" && o.componentStack.length > 0) {
      console.warn(`${tag} arg[${index}] componentStack:\n${o.componentStack}`);
    }
    console.warn(`${tag} arg[${index}] keys:`, Object.keys(o));
    return;
  }
  console.warn(`${tag} arg[${index}]:`, arg);
}

/**
 * Dev-only: intercepts "Maximum update depth" logs and prints extra diagnostics.
 * Import once from root `_layout` (first import).
 */
export function installUpdateDepthProbe(): void {
  if (!__DEV__) return;
  if (installed) return;
  installed = true;

  const tag = "[DEPTH-PROBE]";

  const origError = console.error;
  console.error = (...args: unknown[]) => {
    Reflect.apply(origError, console, args as []);
    try {
      const flat = args
        .map((a) =>
          a instanceof Error ? `${a.message}\n${a.stack ?? ""}` : String(a),
        )
        .join(" ");
      if (!isMaxDepthMessage(flat)) return;

      // Defer so (1) React finishes logging first (2) our line numbers don't look like the culprit
      queueMicrotask(() => {
        console.warn(
          `${tag} Max update depth — expanded args (look for .stack / componentStack):`,
        );
        args.forEach((a, i) => logDepthProbeArg(tag, i, a));
        console.warn(
          `${tag} Next: add useRenderSpy("Name") in app/_layout providers or tab layout; the name whose render count climbs is inside the loop.`,
        );
      });
    } catch {
      /* ignore */
    }
  };

  const ErrorUtilsRN = (global as { ErrorUtils?: {
    getGlobalHandler: () => ((e: Error, isFatal?: boolean) => void) | undefined;
    setGlobalHandler: (fn: (e: Error, isFatal?: boolean) => void) => void;
  } }).ErrorUtils;

  if (ErrorUtilsRN?.getGlobalHandler && ErrorUtilsRN.setGlobalHandler) {
    const prev = ErrorUtilsRN.getGlobalHandler();
    ErrorUtilsRN.setGlobalHandler((error: Error, isFatal?: boolean) => {
      prev?.(error, isFatal);
      const msg = error?.message ?? String(error);
      if (!/maximum update depth/i.test(msg)) return;
      queueMicrotask(() => {
        console.warn(`${tag} ErrorUtils global handler — error.stack:\n${error?.stack ?? "(none)"}`);
        const cs = (error as Error & { componentStack?: string }).componentStack;
        if (typeof cs === "string" && cs.length > 0) {
          console.warn(`${tag} ErrorUtils error.componentStack:\n${cs}`);
        }
      });
    });
  }

  if (__DEV__) {
    console.info(
      `${tag} Installed (dev). Max-depth logs deferred diagnostics after the default React message.`,
    );
  }
}

/**
 * Dev-only: call at the top of a component body. Logs when render count crosses
 * multiples of `warnEvery` — a climbing number means that component keeps re-rendering.
 */
export function useRenderSpy(componentName: string, warnEvery = 50): void {
  if (!__DEV__) return;
  const count = useRef(0);
  count.current += 1;
  if (count.current >= warnEvery && count.current % warnEvery === 0) {
    console.warn(
      `[DEPTH-PROBE] "${componentName}" render #${count.current} — hot subtree (narrow spies into children)`,
    );
  }
}

installUpdateDepthProbe();
