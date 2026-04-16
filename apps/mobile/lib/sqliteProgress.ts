import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";

const db = SQLite.openDatabaseSync("ph_progress.db");
let initialized = false;

export type StrengthEntry = {
  id: string;
  date_iso: string;
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  sets: number | null;
  notes: string;
  created_at: string;
};

export type BodyWeightEntry = {
  id: string;
  date_iso: string;
  weight_kg: number;
  notes: string;
  created_at: string;
};

export type MeasurementKind =
  | "chest"
  | "waist"
  | "hips"
  | "arm"
  | "thigh"
  | "calf"
  | "neck"
  | "other";

export type MeasurementEntry = {
  id: string;
  date_iso: string;
  kind: MeasurementKind;
  label: string;
  value_cm: number;
  notes: string;
  created_at: string;
};

export function initProgressDb() {
  if (initialized) return;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS strength_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date_iso TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      reps INTEGER,
      sets INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_strength_date ON strength_entries(date_iso);

    CREATE TABLE IF NOT EXISTS body_weights (
      id TEXT PRIMARY KEY NOT NULL,
      date_iso TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bw_date ON body_weights(date_iso);

    CREATE TABLE IF NOT EXISTS measurement_entries (
      id TEXT PRIMARY KEY NOT NULL,
      date_iso TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      value_cm REAL NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meas_date ON measurement_entries(date_iso);
  `);
  initialized = true;
}

function ensure() {
  if (!initialized) initProgressDb();
}

export function insertStrength(input: Omit<StrengthEntry, "id" | "created_at">) {
  ensure();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.runSync(
    `INSERT INTO strength_entries (id, date_iso, exercise_name, weight_kg, reps, sets, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.date_iso,
      input.exercise_name.trim(),
      input.weight_kg,
      input.reps ?? null,
      input.sets ?? null,
      input.notes ?? "",
      created_at,
    ],
  );
  return { id, created_at };
}

export function listStrength(limit = 50): StrengthEntry[] {
  ensure();
  return db.getAllSync<StrengthEntry>(
    "SELECT * FROM strength_entries ORDER BY date_iso DESC, created_at DESC LIMIT ?",
    [limit],
  );
}

export function insertBodyWeight(input: Omit<BodyWeightEntry, "id" | "created_at">) {
  ensure();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.runSync(
    `INSERT INTO body_weights (id, date_iso, weight_kg, notes, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, input.date_iso, input.weight_kg, input.notes ?? "", created_at],
  );
  return { id, created_at };
}

export function listBodyWeights(limit = 90): BodyWeightEntry[] {
  ensure();
  return db.getAllSync<BodyWeightEntry>(
    "SELECT * FROM body_weights ORDER BY date_iso DESC, created_at DESC LIMIT ?",
    [limit],
  );
}

export function insertMeasurement(
  input: Omit<MeasurementEntry, "id" | "created_at">,
) {
  ensure();
  const id = Crypto.randomUUID();
  const created_at = new Date().toISOString();
  db.runSync(
    `INSERT INTO measurement_entries (id, date_iso, kind, label, value_cm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.date_iso,
      input.kind,
      input.label.trim(),
      input.value_cm,
      input.notes ?? "",
      created_at,
    ],
  );
  return { id, created_at };
}

export function listMeasurements(limit = 50): MeasurementEntry[] {
  ensure();
  return db.getAllSync<MeasurementEntry>(
    "SELECT * FROM measurement_entries ORDER BY date_iso DESC, created_at DESC LIMIT ?",
    [limit],
  );
}

export function deleteStrength(id: string) {
  ensure();
  db.runSync("DELETE FROM strength_entries WHERE id = ?", [id]);
}

export function deleteBodyWeight(id: string) {
  ensure();
  db.runSync("DELETE FROM body_weights WHERE id = ?", [id]);
}

export function deleteMeasurement(id: string) {
  ensure();
  db.runSync("DELETE FROM measurement_entries WHERE id = ?", [id]);
}
