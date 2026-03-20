import type { SessionItem } from "@/constants/program-details";
import { getSessionTypesForTab } from "@/constants/program-details";

type ContentRow = {
  id: number;
  title: string;
  body: string;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  sectionType: string;
  order?: number | null;
};

/** When section content rows include week/session metadata, build week → session → exercises for the Program UI. */
export function sessionsFromSectionContentForTab(
  items: ContentRow[],
  tab: string,
): SessionItem[] | null {
  const types = new Set(getSessionTypesForTab(tab));
  const rows = items.filter((r) => types.has(String(r.sectionType)));
  if (rows.length < 2) return null;

  const hasStructure = rows.some((r) => {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    return (
      m.weekNumber != null ||
      m.sessionNumber != null ||
      (typeof m.sessionLabel === "string" && String(m.sessionLabel).trim().length > 0)
    );
  });
  if (!hasStructure) return null;

  const sorted = [...rows].sort((a, b) => {
    const ma = (a.metadata ?? {}) as Record<string, unknown>;
    const mb = (b.metadata ?? {}) as Record<string, unknown>;
    const wa = Number(ma.weekNumber) || 1;
    const wb = Number(mb.weekNumber) || 1;
    if (wa !== wb) return wa - wb;
    const sa = ma.sessionNumber != null ? Number(ma.sessionNumber) : 0;
    const sb = mb.sessionNumber != null ? Number(mb.sessionNumber) : 0;
    if (sa !== sb) return sa - sb;
    return (a.order ?? a.id) - (b.order ?? b.id);
  });

  const groups = new Map<string, ContentRow[]>();
  for (const row of sorted) {
    const m = (row.metadata ?? {}) as Record<string, unknown>;
    const week = Number(m.weekNumber) || 1;
    const sn = m.sessionNumber != null ? Number(m.sessionNumber) : null;
    const label = typeof m.sessionLabel === "string" ? m.sessionLabel.trim() : "";
    const key = `${week}__${sn != null && !Number.isNaN(sn) ? `n${sn}` : label || `id-${row.id}`}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const sessions: SessionItem[] = [];
  const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const key of sortedKeys) {
    const groupRows = groups.get(key)!;
    const first = groupRows[0]!;
    const m = (first.metadata ?? {}) as Record<string, unknown>;
    const week = Number(m.weekNumber) || 1;
    const sn = m.sessionNumber != null ? Number(m.sessionNumber) : null;
    const label = typeof m.sessionLabel === "string" ? m.sessionLabel.trim() : "";
    let name = label;
    if (!name && sn != null && !Number.isNaN(sn) && sn >= 1 && sn <= 26) {
      name = `Session ${String.fromCharCode(64 + sn)}`;
    }
    if (!name) {
      name = `Session ${sessions.length + 1}`;
    }

    const exercises: SessionItem["exercises"] = groupRows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const restSeconds = meta.restSeconds != null ? Number(meta.restSeconds) : null;
      const restNum = restSeconds != null && !Number.isNaN(restSeconds) ? restSeconds : undefined;
      return {
        id: String(r.id),
        name: r.title,
        sets: meta.sets != null ? Number(meta.sets) : undefined,
        reps: meta.reps != null ? Number(meta.reps) : undefined,
        time: meta.duration != null ? `${meta.duration}s` : undefined,
        rest: restNum != null ? `${restNum}s` : undefined,
        restSeconds: restNum,
        notes: r.body || undefined,
        videoUrl: r.videoUrl || undefined,
        progressions: typeof meta.progression === "string" ? meta.progression : undefined,
        regressions: typeof meta.regression === "string" ? meta.regression : undefined,
      };
    });

    sessions.push({
      id: `${key}-${first.id}`,
      name,
      weekNumber: week,
      exercises,
    });
  }

  return sessions.length ? sessions : null;
}
