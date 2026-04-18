import { type Href, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

function hrefKey(href: Href): string {
  if (typeof href === "string") return href;
  const o = href as { pathname?: string; params?: Record<string, unknown> };
  if (o.pathname) {
    return `${o.pathname}${o.params ? JSON.stringify(o.params) : ""}`;
  }
  return JSON.stringify(href);
}

/**
 * One-shot `router.replace`. Prefer over expo-router `Redirect`: `Redirect` wires
 * `router.replace` through `useFocusEffect` with an inline callback (new reference
 * every render). When a parent re-renders often (e.g. Redux), that re-runs the
 * focus effect while focused and can call `replace` in a tight loop → max update depth.
 */
export function ReplaceOnce({ href }: { href: Href }) {
  const router = useRouter();
  const key = hrefKey(href);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    router.replace(href);
  }, [href, key, router]);

  return null;
}
