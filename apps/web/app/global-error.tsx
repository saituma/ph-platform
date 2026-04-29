"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error (root layout failed):", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#0b0b0d",
            color: "#f4f4f5",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
              The app failed to load
            </h1>
            <p style={{ marginTop: 12, fontSize: 14, opacity: 0.7 }}>
              {error.message || "An unexpected error occurred while loading the app shell."}
            </p>
            {error.digest ? (
              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 20,
                padding: "10px 18px",
                borderRadius: 6,
                background: "#22c55e",
                color: "#0b0b0d",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
