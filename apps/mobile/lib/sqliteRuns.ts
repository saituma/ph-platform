import * as SQLite from "expo-sqlite";

/** Saved on the summary screen before feedback; replaced when the user saves feedback. */
export const EFFORT_PENDING_FEEDBACK = -1;

export interface RunRecord {
  id: string;
  date: string;
  distance_meters: number;
  duration_seconds: number;
  avg_pace: number;
  avg_speed: number;
  calories: number;
  coordinates: string; // JSON string array
  effort_level: number;
  feel_tags: string; // JSON string array
  notes: string;
  synced_at: string | null;
  user_id: string | null;
}

const db = SQLite.openDatabaseSync("tracking_premium.db"); // new db name to prevent schema mismatch
let isInitialized = false;

export function initSQLiteRuns() {
  if (isInitialized) return;

  db.execSync(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      distance_meters REAL NOT NULL,
      duration_seconds INTEGER NOT NULL,
      avg_pace REAL,
      avg_speed REAL,
      calories REAL,
      coordinates TEXT,
      effort_level INTEGER,
      feel_tags TEXT,
      notes TEXT,
      synced_at TEXT
    );
  `);

  // Migrations
  try {
    const columns = db.getAllSync<{ name: string }>("PRAGMA table_info(runs)");
    const colNames = columns.map((c) => c.name);
    if (!colNames.includes("synced_at")) {
      db.execSync("ALTER TABLE runs ADD COLUMN synced_at TEXT;");
    }
    if (!colNames.includes("user_id")) {
      db.execSync("ALTER TABLE runs ADD COLUMN user_id TEXT;");
    }
  } catch {
    // ignore — columns likely already exist
  }

  isInitialized = true;
}

type PersonalBests = {
  best5kSeconds: number | null;
  longestRunMeters: number | null;
  bestPaceMinPerKm: number | null;
};

function ensureInitialized() {
  if (!isInitialized) {
    initSQLiteRuns();
  }
}

export function saveRunRecord(run: Omit<RunRecord, "synced_at">) {
  ensureInitialized();
  return db.runSync(
    `INSERT OR REPLACE INTO runs (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories, coordinates, effort_level, feel_tags, notes, synced_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      run.id,
      run.date,
      run.distance_meters,
      run.duration_seconds,
      run.avg_pace,
      run.avg_speed,
      run.calories,
      run.coordinates,
      run.effort_level,
      run.feel_tags,
      run.notes,
      run.user_id ?? null,
    ],
  );
}

export function getRecentRuns(limit: number = 3, userId?: string | null): RunRecord[] {
  ensureInitialized();
  if (userId) {
    return db.getAllSync<RunRecord>(
      "SELECT * FROM runs WHERE user_id = ? ORDER BY date DESC LIMIT ?",
      [userId, limit],
    );
  }
  return db.getAllSync<RunRecord>(
    "SELECT * FROM runs WHERE user_id IS NULL ORDER BY date DESC LIMIT ?",
    [limit],
  );
}

/**
 * Matches the "THIS WEEK" card: last 7 calendar days through end of today.
 */
export function getWeeklySummaries(now: Date = new Date(), userId?: string | null) {
  ensureInitialized();
  const windowEnd = new Date(now);
  windowEnd.setHours(23, 59, 59, 999);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 6);
  windowStart.setHours(0, 0, 0, 0);

  let summary: { totalDistance: number | null; totalTime: number | null; numRuns: number | null } | null;
  if (userId) {
    summary = db.getFirstSync<{
      totalDistance: number | null;
      totalTime: number | null;
      numRuns: number | null;
    }>(
      `SELECT
        COALESCE(SUM(distance_meters), 0) AS totalDistance,
        COALESCE(SUM(duration_seconds), 0) AS totalTime,
        COUNT(*) AS numRuns
       FROM runs
       WHERE date >= ? AND date <= ? AND user_id = ?`,
      [windowStart.toISOString(), windowEnd.toISOString(), userId],
    );
  } else {
    summary = db.getFirstSync<{
      totalDistance: number | null;
      totalTime: number | null;
      numRuns: number | null;
    }>(
      `SELECT
        COALESCE(SUM(distance_meters), 0) AS totalDistance,
        COALESCE(SUM(duration_seconds), 0) AS totalTime,
        COUNT(*) AS numRuns
       FROM runs
       WHERE date >= ? AND date <= ? AND user_id IS NULL`,
      [windowStart.toISOString(), windowEnd.toISOString()],
    );
  }

  return {
    totalDistance: summary?.totalDistance ?? 0,
    totalTime: summary?.totalTime ?? 0,
    numRuns: summary?.numRuns ?? 0,
  };
}

export function getPersonalBests(userId?: string | null): PersonalBests {
  ensureInitialized();
  const runs = userId
    ? db.getAllSync<RunRecord>("SELECT * FROM runs WHERE user_id = ?", [userId])
    : db.getAllSync<RunRecord>("SELECT * FROM runs WHERE user_id IS NULL");

  let best5kSeconds: number | null = null;
  let longestRunMeters: number | null = null;
  let bestPaceMinPerKm: number | null = null;

  runs.forEach((r) => {
    if (r.effort_level === EFFORT_PENDING_FEEDBACK) return;

    if (Number.isFinite(r.distance_meters)) {
      longestRunMeters = longestRunMeters === null ? r.distance_meters : Math.max(longestRunMeters, r.distance_meters);
    }

    if (Number.isFinite(r.avg_pace) && r.avg_pace > 0) {
      bestPaceMinPerKm = bestPaceMinPerKm === null ? r.avg_pace : Math.min(bestPaceMinPerKm, r.avg_pace);
    }

    // Consider "5K" anything in the 4.8–5.2km range.
    if (r.distance_meters >= 4800 && r.distance_meters <= 5200 && Number.isFinite(r.duration_seconds) && r.duration_seconds > 0) {
      best5kSeconds = best5kSeconds === null ? r.duration_seconds : Math.min(best5kSeconds, r.duration_seconds);
    }
  });

  return { best5kSeconds, longestRunMeters, bestPaceMinPerKm };
}

// ──────────────────────────────────────────────
// Cloud sync helpers
// ──────────────────────────────────────────────

export function getUnsyncedRuns(userId?: string | null): RunRecord[] {
  ensureInitialized();
  if (userId) {
    return db.getAllSync<RunRecord>("SELECT * FROM runs WHERE synced_at IS NULL AND user_id = ?", [userId]);
  }
  return db.getAllSync<RunRecord>("SELECT * FROM runs WHERE synced_at IS NULL AND user_id IS NULL");
}

export function deleteRunRecord(id: string) {
  ensureInitialized();
  db.runSync("DELETE FROM runs WHERE id = ?", [id]);
}

export function markRunsSynced(ids: string[]) {
  ensureInitialized();
  if (!ids.length) return;
  const now = new Date().toISOString();
  const placeholders = ids.map(() => "?").join(", ");
  db.runSync(
    `UPDATE runs SET synced_at = ? WHERE id IN (${placeholders})`,
    [now, ...ids],
  );
}

export function upsertRunFromServer(run: {
  id: string;
  date: string;
  distance_meters: number;
  duration_seconds: number;
  avg_pace: number | null;
  avg_speed: number | null;
  calories: number | null;
  coordinates: string | null;
  effort_level: number | null;
  feel_tags: string | null;
  notes: string | null;
  user_id?: string | null;
}) {
  ensureInitialized();
  db.runSync(
    `INSERT OR IGNORE INTO runs (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories, coordinates, effort_level, feel_tags, notes, synced_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      run.id,
      run.date,
      run.distance_meters,
      run.duration_seconds,
      run.avg_pace ?? 0,
      run.avg_speed ?? 0,
      run.calories ?? 0,
      run.coordinates ?? "[]",
      run.effort_level ?? 0,
      run.feel_tags ?? "[]",
      run.notes ?? "",
      new Date().toISOString(),
      run.user_id ?? null,
    ],
  );
}
