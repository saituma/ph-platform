let exiting = false;

function formatUnknown(error: unknown) {
  if (error instanceof Error) {
    const anyError = error as Error & {
      code?: unknown;
      detail?: unknown;
      hint?: unknown;
      schema?: unknown;
      table?: unknown;
      column?: unknown;
      constraint?: unknown;
      where?: unknown;
      routine?: unknown;
      cause?: unknown;
    };

    const extras: string[] = [];
    const pushIfStringy = (label: string, value: unknown) => {
      if (value === undefined || value === null) return;
      const text = typeof value === "string" ? value : String(value);
      if (text.trim().length === 0) return;
      extras.push(`${label}: ${text}`);
    };

    pushIfStringy("code", anyError.code);
    pushIfStringy("detail", anyError.detail);
    pushIfStringy("hint", anyError.hint);
    pushIfStringy("schema", anyError.schema);
    pushIfStringy("table", anyError.table);
    pushIfStringy("column", anyError.column);
    pushIfStringy("constraint", anyError.constraint);
    pushIfStringy("where", anyError.where);
    pushIfStringy("routine", anyError.routine);

    let causeBlock = "";
    if (anyError.cause instanceof Error) {
      causeBlock = `\nCaused by: ${anyError.cause.name}: ${anyError.cause.message}`;
    } else if (anyError.cause != null) {
      causeBlock = `\nCaused by: ${String(anyError.cause)}`;
    }

    const extrasBlock = extras.length ? `\n${extras.join("\n")}` : "";
    return `${error.name}: ${error.message}${extrasBlock}${causeBlock}${error.stack ? `\n${error.stack}` : ""}`;
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

  const message = error === undefined ? `[Fatal] ${context}\n` : `[Fatal] ${context}\n${formatUnknown(error)}\n`;

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
