import { ServiceType } from "@/types/admin";

export function formatIsoShort(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value;
  return d.toLocaleString();
}

export function parseIntOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  const asInt = Math.floor(n);
  if (asInt < 0) return undefined;
  return asInt;
}

export function defaultServicePatchJson(s: ServiceType) {
  return JSON.stringify(
    {
      name: s.name ?? undefined,
      type: s.type ?? undefined,
      durationMinutes: s.durationMinutes ?? undefined,
      capacity: s.capacity ?? undefined,
      isActive: s.isActive ?? undefined,
      defaultLocation: s.defaultLocation ?? undefined,
      defaultMeetingLink: s.defaultMeetingLink ?? undefined,
      programTier: s.programTier ?? undefined,
      eligiblePlans: s.eligiblePlans ?? undefined,
    },
    null,
    2,
  );
}
