"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
              onClick={reset}
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
