import { usePathname, useRouter, useSegments } from "expo-router";

/**
 * Expo Router hooks throw when rendered outside a navigation context.
 * That can happen in some portal-like trees (e.g. certain Modals) or
 * during transient mounting in dev/error flows.
 *
 * These wrappers keep the UI from crashing by returning safe fallbacks.
 */

export function useSafePathname(fallback = ""): string {
  try {
    return usePathname() ?? fallback;
  } catch {
    return fallback;
  }
}

export function useSafeSegments(fallback: string[] = []): string[] {
  try {
    const segments = useSegments();
    return Array.isArray(segments) ? (segments as unknown as string[]) : fallback;
  } catch {
    return fallback;
  }
}

export function useSafeRouter(): ReturnType<typeof useRouter> | null {
  try {
    return useRouter();
  } catch {
    return null;
  }
}
