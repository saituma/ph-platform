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
}

export function saveRunRecord(run: RunRecord) {
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
  return db.getAllSync<RunRecord>(
    "SELECT * FROM runs ORDER BY date DESC LIMIT ?",
    [limit],
  );
}

export function getWeeklySummaries() {
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
