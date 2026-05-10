"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = new Set(["/login"]);

function isProtectedPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return false;
  return !pathname.startsWith("/api/");
}

// Calls the server-side session endpoint to verify the httpOnly-cookie-backed
// session is still valid. Middleware is the primary auth guard; this handles
// the edge case where a session expires while the user is already on a page.
function checkSession(): Promise<boolean> {
  return fetch("/api/auth/session", { cache: "no-store" })
    .then((res) => res.json() as Promise<{ authenticated?: boolean }>)
    .then(({ authenticated }) => authenticated === true)
    .catch(() => false);
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || !isProtectedPath(pathname)) return;
    checkSession().then((authenticated) => {
      if (!authenticated) {
        fetch("/api/auth/clear-session", { method: "POST" }).finally(() => {
          router.replace("/login");
        });
      }
    });
  }, [pathname, router]);

  // Always render children immediately — no blank-screen while "checking".
  return <>{children}</>;
}
