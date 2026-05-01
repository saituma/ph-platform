"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = new Set(["/login"]);

function isProtectedPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return false;
  return !pathname.startsWith("/api/");
}

// Reads accessTokenClient (non-httpOnly) and checks JWT exp without a network call.
// Middleware is the real auth guard; this only handles edge cases on the client.
function hasValidClientToken(): boolean {
  if (typeof document === "undefined") return true;
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("accessTokenClient="));
  const token = raw ? raw.slice("accessTokenClient=".length) : "";
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    ) as { exp?: number };
    if (typeof payload.exp === "number") return payload.exp * 1000 > Date.now();
  } catch {}
  return true;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || !isProtectedPath(pathname)) return;
    if (!hasValidClientToken()) {
      router.replace("/login");
    }
  }, [pathname, router]);

  // Always render children immediately — no blank-screen while "checking".
  return <>{children}</>;
}
