"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_PATHS = new Set(["/login"]);

function isProtectedPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return false;
  return !pathname.startsWith("/api/");
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    if (!pathname || !isProtectedPath(pathname)) {
      setStatus("allowed");
      return;
    }

    let active = true;
    setStatus("checking");

    fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!active) return;
        if (res.ok) {
          setStatus("allowed");
          return;
        }
        router.replace("/login");
      })
      .catch(() => {
        if (!active) return;
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (!pathname || (!PUBLIC_PATHS.has(pathname) && status !== "allowed")) {
    return null;
  }

  return <>{children}</>;
}
