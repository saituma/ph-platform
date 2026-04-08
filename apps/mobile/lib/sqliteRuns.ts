import * as SQLite from "expo-sqlite";

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
}

const db = SQLite.openDatabaseSync("tracking_premium.db"); // new db name to prevent schema mismatch
let isInitialized = false;

export function initSQLiteRuns() {
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
      notes TEXT
    );
  `);
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

export function saveRunRecord(run: RunRecord) {
  ensureInitialized();
  return db.runSync(
    `INSERT INTO runs (id, date, distance_meters, duration_seconds, avg_pace, avg_speed, calories, coordinates, effort_level, feel_tags, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  );
}

export function getRecentRuns(limit: number = 3): RunRecord[] {
  ensureInitialized();
  return db.getAllSync<RunRecord>(
    "SELECT * FROM runs ORDER BY date DESC LIMIT ?",
    [limit],
  );
}

export function getWeeklySummaries() {
  ensureInitialized();
  const runs = db.getAllSync<RunRecord>("SELECT * FROM runs");
  
  const now = Date.now();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  
  let totalDistance = 0;
  let totalTime = 0;
  let numRuns = 0;
  
  runs.forEach((r) => {
    const runDate = new Date(r.date).getTime();
    if (now - runDate < ONE_WEEK) {
      totalDistance += r.distance_meters;
      totalTime += r.duration_seconds;
      numRuns += 1;
    }
  });

  return { totalDistance, totalTime, numRuns };
}

export function getPersonalBests(): PersonalBests {
  ensureInitialized();
  const runs = db.getAllSync<RunRecord>("SELECT * FROM runs");

  let best5kSeconds: number | null = null;
  let longestRunMeters: number | null = null;
  let bestPaceMinPerKm: number | null = null;

  runs.forEach((r) => {
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
