"use client";

import { useEffect } from "react";

export default function PortalConfigError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal Config error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Portal Config failed to load</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "Could not reach the API or read the portal_configs table."}
        </p>
        <p className="text-xs text-muted-foreground/60">
          Check that the API process is running on port 3001 and that the database is reachable.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
