"use client";

import { useEffect } from "react";

export default function TestimonialsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Testimonials error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Testimonials failed to load</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "Home content or pending submissions could not be loaded."}
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
