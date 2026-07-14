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
  sport: string | null;
  is_draft?: number | null;
  lifecycle?: string | null;
  privacy?: string | null;
  sync_status?: string | null;
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
      synced_at TEXT,
      user_id TEXT,
      sport TEXT,
      is_draft INTEGER DEFAULT 0,
      lifecycle TEXT,
      privacy TEXT DEFAULT 'private',
      sync_status TEXT DEFAULT 'pending'
    );
  `);

  // A discarded run may already have been pushed to the server. Deleting only the local row
  // would leave it visible to the coach forever, so record a tombstone and let the sync queue
  // propagate the delete — it must survive being offline, a crash, or an app restart.
  db.execSync(`
    CREATE TABLE IF NOT EXISTS run_deletions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      created_at TEXT NOT NULL
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
    if (!colNames.includes("sport")) {
      db.execSync("ALTER TABLE runs ADD COLUMN sport TEXT;");
    }
    if (!colNames.includes("is_draft")) {
      db.execSync("ALTER TABLE runs ADD COLUMN is_draft INTEGER DEFAULT 0;");
    }
    if (!colNames.includes("lifecycle")) {
      db.execSync("ALTER TABLE runs ADD COLUMN lifecycle TEXT;");
    }
    if (!colNames.includes("privacy")) {
      db.execSync("ALTER TABLE runs ADD COLUMN privacy TEXT DEFAULT 'private';");
    }
    if (!colNames.includes("sync_status")) {
      db.execSync("ALTER TABLE runs ADD COLUMN sync_status TEXT DEFAULT 'pending';");
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
    `INSERT OR REPLACE INTO runs (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories, coordinates, effort_level, feel_tags, notes, synced_at, user_id, sport, is_draft, lifecycle, privacy, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, 'saved', 'private', 'pending')`,
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
      run.sport ?? null,
    ],
  );
}

export function saveActiveRunDraft(run: {
  id: string;
  date: string;
  distance_meters: number;
  duration_seconds: number;
  avg_pace: number;
  avg_speed: number;
  calories: number;
  coordinates: string;
  user_id: string | null;
  sport: string | null;
}) {
  ensureInitialized();
  return db.runSync(
    `INSERT OR REPLACE INTO runs (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories, coordinates, effort_level, feel_tags, notes, synced_at, user_id, sport, is_draft, lifecycle, privacy, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1, 'finishing', 'private', 'pending')`,
    [
      run.id,
      run.date,
      run.distance_meters,
      run.duration_seconds,
      run.avg_pace,
      run.avg_speed,
      run.calories,
      run.coordinates,
      EFFORT_PENDING_FEEDBACK,
      "[]",
      "",
      run.user_id ?? null,
      run.sport ?? null,
    ],
  );
}

export function getRunById(id: string): RunRecord | null {
  ensureInitialized();
  const rows = db.getAllSync<RunRecord>("SELECT * FROM runs WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export function getRecentRuns(limit: number = 3, userId?: string | null): RunRecord[] {
  ensureInitialized();
  if (userId) {
    return db.getAllSync<RunRecord>(
      "SELECT * FROM runs WHERE user_id = ? AND COALESCE(is_draft, 0) = 0 ORDER BY date DESC LIMIT ?",
      [userId, limit],
    );
  }
  return db.getAllSync<RunRecord>(
    "SELECT * FROM runs WHERE user_id IS NULL AND COALESCE(is_draft, 0) = 0 ORDER BY date DESC LIMIT ?",
    [limit],
  );
}

/**
 * Matches the "THIS WEEK" card: last 7 calendar days through end of today.
 */
/** Async variant for screen loads — run rows carry full coordinate blobs, so a sync read blocks the JS thread. */
export async function getRecentRunsAsync(limit: number = 3, userId?: string | null): Promise<RunRecord[]> {
  ensureInitialized();
  if (userId) {
    return db.getAllAsync<RunRecord>(
      "SELECT * FROM runs WHERE user_id = ? AND COALESCE(is_draft, 0) = 0 ORDER BY date DESC LIMIT ?",
      [userId, limit],
    );
  }
  return db.getAllAsync<RunRecord>(
    "SELECT * FROM runs WHERE user_id IS NULL AND COALESCE(is_draft, 0) = 0 ORDER BY date DESC LIMIT ?",
    [limit],
  );
}

/** Async — a sync read here blocks the JS thread, which stalls tab switching while it runs. */
export async function getWeeklySummaries(now: Date = new Date(), userId?: string | null) {
  ensureInitialized();
  const windowEnd = new Date(now);
  windowEnd.setHours(23, 59, 59, 999);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 6);
  windowStart.setHours(0, 0, 0, 0);

  type SummaryRow = {
    totalDistance: number | null;
    totalTime: number | null;
    numRuns: number | null;
    draftDistance: number | null;
    draftTime: number | null;
    draftRuns: number | null;
  };

  const summary = userId
    ? await db.getFirstAsync<SummaryRow>(
        `SELECT
          COALESCE(SUM(distance_meters), 0) AS totalDistance,
          COALESCE(SUM(duration_seconds), 0) AS totalTime,
          COUNT(*) AS numRuns,
          COALESCE(SUM(CASE WHEN COALESCE(is_draft, 0) = 1 THEN distance_meters ELSE 0 END), 0) AS draftDistance,
          COALESCE(SUM(CASE WHEN COALESCE(is_draft, 0) = 1 THEN duration_seconds ELSE 0 END), 0) AS draftTime,
          COALESCE(SUM(CASE WHEN COALESCE(is_draft, 0) = 1 THEN 1 ELSE 0 END), 0) AS draftRuns
         FROM runs
         WHERE date >= ? AND date <= ? AND user_id = ?`,
        [windowStart.toISOString(), windowEnd.toISOString(), userId],
      )
    : await db.getFirstAsync<SummaryRow>(
        `SELECT
          COALESCE(SUM(distance_meters), 0) AS totalDistance,
          COALESCE(SUM(duration_seconds), 0) AS totalTime,
          COUNT(*) AS numRuns,
          COALESCE(SUM(CASE WHEN COALESCE(is_draft, 0) = 1 THEN distance_meters ELSE 0 END), 0) AS draftDistance,
          COALESCE(SUM(CASE WHEN COALESCE(is_draft, 0) = 1 THEN duration_seconds ELSE 0 END), 0) AS draftTime,
          COALESCE(SUM(CASE WHEN COALESCE(is_draft, 0) = 1 THEN 1 ELSE 0 END), 0) AS draftRuns
         FROM runs
         WHERE date >= ? AND date <= ? AND user_id IS NULL`,
        [windowStart.toISOString(), windowEnd.toISOString()],
      );

  return {
    totalDistance: summary?.totalDistance ?? 0,
    totalTime: summary?.totalTime ?? 0,
    numRuns: summary?.numRuns ?? 0,
    draftDistance: summary?.draftDistance ?? 0,
    draftTime: summary?.draftTime ?? 0,
    draftRuns: summary?.draftRuns ?? 0,
  };
}

export function getPersonalBests(userId?: string | null): PersonalBests {
  ensureInitialized();
  const runs = userId
    ? db.getAllSync<RunRecord>("SELECT * FROM runs WHERE user_id = ? AND COALESCE(is_draft, 0) = 0", [userId])
    : db.getAllSync<RunRecord>("SELECT * FROM runs WHERE user_id IS NULL AND COALESCE(is_draft, 0) = 0");

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

/**
 * Reassign orphaned local runs to the logged-in user. A run saved before the
 * profile id was loaded gets stamped user_id = NULL and is otherwise never
 * picked up by the uploader (which filters on the current user_id), so it
 * strands locally forever. Claim those rows on sync so they push.
 */
export function adoptOrphanRuns(userId: string): number {
  ensureInitialized();
  const res = db.runSync("UPDATE runs SET user_id = ? WHERE user_id IS NULL", [userId]);
  return res.changes ?? 0;
}

export function getUnsyncedRuns(userId?: string | null): RunRecord[] {
  ensureInitialized();
  if (userId) {
    return db.getAllSync<RunRecord>("SELECT * FROM runs WHERE synced_at IS NULL AND user_id = ? AND COALESCE(is_draft, 0) = 0", [userId]);
  }
  return db.getAllSync<RunRecord>("SELECT * FROM runs WHERE synced_at IS NULL AND user_id IS NULL AND COALESCE(is_draft, 0) = 0");
}

export function updateRunFeedback(
  id: string,
  feedback: { effort_level: number; feel_tags: string; notes: string; privacy?: string },
) {
  ensureInitialized();
  if (feedback.privacy) {
    db.runSync(
      "UPDATE runs SET effort_level = ?, feel_tags = ?, notes = ?, privacy = ?, synced_at = NULL WHERE id = ?",
      [feedback.effort_level, feedback.feel_tags, feedback.notes, feedback.privacy, id],
    );
    return;
  }
  db.runSync(
    "UPDATE runs SET effort_level = ?, feel_tags = ?, notes = ?, synced_at = NULL WHERE id = ?",
    [feedback.effort_level, feedback.feel_tags, feedback.notes, id],
  );
}

type ServerRunPayload = {
  clientId: string;
  date: string | Date;
  distanceMeters: number;
  durationSeconds: number;
  avgPace?: number | null;
  avgSpeed?: number | null;
  calories?: number | null;
  coordinates?: unknown;
  effortLevel?: number | null;
  feelTags?: unknown;
  notes?: string | null;
  sport?: string | null;
  updatedAt?: string | Date | null;
};

export function upsertServerRuns(runs: ServerRunPayload[], userId: string) {
  ensureInitialized();
  for (const run of runs) {
    const coordsStr =
      run.coordinates == null
        ? null
        : typeof run.coordinates === "string"
          ? run.coordinates
          : JSON.stringify(run.coordinates);
    const feelTagsStr =
      run.feelTags == null
        ? null
        : typeof run.feelTags === "string"
          ? run.feelTags
          : JSON.stringify(run.feelTags);
    const dateStr = run.date instanceof Date ? run.date.toISOString() : String(run.date);
    const syncedAt =
      run.updatedAt == null
        ? new Date().toISOString()
        : run.updatedAt instanceof Date
          ? run.updatedAt.toISOString()
          : String(run.updatedAt);

    db.runSync(
      `INSERT OR REPLACE INTO runs
        (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories,
         coordinates, effort_level, feel_tags, notes, synced_at, user_id, sport, is_draft)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        run.clientId,
        dateStr,
        run.distanceMeters,
        run.durationSeconds,
        run.avgPace ?? null,
        run.avgSpeed ?? null,
        run.calories ?? null,
        coordsStr,
        run.effortLevel ?? null,
        feelTagsStr,
        run.notes ?? null,
        syncedAt,
        userId,
        run.sport ?? null,
      ],
    );
  }
}

export function deleteRunRecord(id: string) {
  ensureInitialized();
  db.runSync("DELETE FROM runs WHERE id = ?", [id]);
}

/**
 * Discard a run everywhere: drop the local row and leave a tombstone so the delete
 * still reaches the server if this run was already synced (the summary screen pushes
 * on open, so by the time the athlete taps Discard the coach can already see it).
 */
export function discardRunRecord(id: string, userId?: string | null) {
  ensureInitialized();
  db.runSync("INSERT OR REPLACE INTO run_deletions (id, user_id, created_at) VALUES (?, ?, ?)", [
    id,
    userId ?? null,
    new Date().toISOString(),
  ]);
  db.runSync("DELETE FROM runs WHERE id = ?", [id]);
}

export function getPendingRunDeletions(userId?: string | null): string[] {
  ensureInitialized();
  const rows = userId
    ? db.getAllSync<{ id: string }>(
        "SELECT id FROM run_deletions WHERE user_id = ? OR user_id IS NULL",
        [userId],
      )
    : db.getAllSync<{ id: string }>("SELECT id FROM run_deletions WHERE user_id IS NULL");
  return rows.map((r) => r.id);
}

export function clearRunDeletion(id: string) {
  ensureInitialized();
  db.runSync("DELETE FROM run_deletions WHERE id = ?", [id]);
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
  sport?: string | null;
}) {
  ensureInitialized();
  db.runSync(
    `INSERT OR IGNORE INTO runs (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories, coordinates, effort_level, feel_tags, notes, synced_at, user_id, sport, is_draft)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
      run.sport ?? null,
    ],
  );
}
