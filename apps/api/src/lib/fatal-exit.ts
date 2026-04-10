let exiting = false;

function formatUnknown(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }
  try {
    return typeof error === "string" ? error : JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Best-effort: write to stderr, then exit.
 * On some platforms, `console.error` may not flush before `process.exit()`.
 */
export function fatalExit(context: string, error?: unknown, exitCode = 1) {
  if (exiting) return;
  exiting = true;

  const message =
    error === undefined
      ? `[Fatal] ${context}\n`
      : `[Fatal] ${context}\n${formatUnknown(error)}\n`;

  process.exitCode = exitCode;

  try {
    process.stderr.write(message, () => {
      // Give logs a moment to flush in container runtimes.
      setTimeout(() => process.exit(exitCode), 1500);
    });
  } catch {
    setTimeout(() => process.exit(exitCode), 1500);
  }
}
