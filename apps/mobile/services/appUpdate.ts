import { apiRequest } from "@/lib/api";

export type AppVersionInfo = {
  latest: string | null;
  minSupported: string | null;
  ios: { url: string | null };
  android: { url: string | null };
};

export async function fetchAppVersionInfo(): Promise<AppVersionInfo> {
  return apiRequest<AppVersionInfo>("/app/version", { suppressLog: true, skipCache: true });
}

/** Numeric dotted-version compare: <0 if a<b, 0 if equal, >0 if a>b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
