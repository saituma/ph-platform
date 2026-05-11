"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { useCreateExerciseMutation } from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

// Maps normalised CSV header → API field
const HEADER_MAP: Record<string, string> = {
  name: "name",
  exercisename: "name",
  category: "category",
  sets: "sets",
  reps: "reps",
  duration: "duration",
  time: "duration",
  durationseconds: "duration",
  rest: "restSeconds",
  restseconds: "restSeconds",
  cues: "cues",
  coachingnotes: "cues",
  howto: "howTo",
  howtotips: "howTo",
  setup: "howTo",
  progression: "progression",
  regression: "regression",
  notes: "notes",
  videourl: "videoUrl",
  video: "videoUrl",
};

type ParsedExercise = {
  name: string;
  category?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restSeconds?: number;
  cues?: string;
  howTo?: string;
  progression?: string;
  regression?: string;
  notes?: string;
  videoUrl?: string;
};

function rowToExercise(row: Record<string, string>): ParsedExercise | null {
  const mapped: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const apiKey = HEADER_MAP[rawKey];
    if (apiKey && value) mapped[apiKey] = value;
  }

  const name = mapped.name?.trim();
  if (!name) return null;

  const numOrUndef = (v?: string) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return {
    name,
    category: mapped.category || undefined,
    sets: numOrUndef(mapped.sets),
    reps: numOrUndef(mapped.reps),
    duration: numOrUndef(mapped.duration),
    restSeconds: numOrUndef(mapped.restSeconds),
    cues: mapped.cues || undefined,
    howTo: mapped.howTo || undefined,
    progression: mapped.progression || undefined,
    regression: mapped.regression || undefined,
    notes: mapped.notes || undefined,
    videoUrl: mapped.videoUrl || undefined,
  };
}

// ─── Template download ────────────────────────────────────────────────────────

const TEMPLATE_HEADERS =
  "name,category,sets,reps,duration,rest,cues,howTo,progression,regression,notes";

const TEMPLATE_EXAMPLES = [
  "Trap Bar Deadlift,Strength,4,6,,,Core tight drive through heel,Setup with bar centred over feet,Add 2.5kg if easy,Goblet squat,",
  "Sprint 20m,Speed,6,,,90,Drive knees high stay tall,,Flying start variation,Jog 20m,",
  "Hip Flexor Stretch,Mobility,3,,60,30,Keep hips square,,Add rotation,Seated version,",
];

function downloadTemplate() {
  const content = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES].join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exercise-library-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportResult = { name: string; ok: boolean; error?: string };

type Stage = "idle" | "preview" | "importing" | "done";

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BulkImportDialog({ open, onClose }: Props) {
  const [createExercise] = useCreateExerciseMutation();

  const [stage, setStage] = useState<Stage>("idle");
  const [parsed, setParsed] = useState<ParsedExercise[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("idle");
    setParsed([]);
    setParseError(null);
    setProgress(0);
    setResults([]);
    setIsDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please upload a .csv file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseCSV(text);
        const exercises = rows
          .map(rowToExercise)
          .filter((ex): ex is ParsedExercise => ex !== null);

        if (exercises.length === 0) {
          setParseError(
            "No valid exercises found. Make sure the file has a header row and a 'name' column.",
          );
          return;
        }
        setParsed(exercises);
        setParseError(null);
        setStage("preview");
      } catch {
        setParseError("Could not parse the CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleImport = async () => {
    setStage("importing");
    setProgress(0);
    const importResults: ImportResult[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const ex = parsed[i];
      try {
        await createExercise(ex).unwrap();
        importResults.push({ name: ex.name, ok: true });
      } catch {
        importResults.push({ name: ex.name, ok: false, error: "Import failed" });
      }
      setProgress(i + 1);
    }

    setResults(importResults);
    setStage("done");

    const successCount = importResults.filter((r) => r.ok).length;
    const failCount = importResults.filter((r) => !r.ok).length;
    if (failCount === 0) {
      toast.success(`${successCount} exercise${successCount !== 1 ? "s" : ""} imported`);
    } else {
      toast.error(`${successCount} imported, ${failCount} failed`);
    }
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Exercises</DialogTitle>
          <DialogDescription>
            Upload a CSV to add multiple exercises at once. Videos can be added
            to each exercise afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">

          {/* ── Stage: idle ──────────────────────────────────── */}
          {stage === "idle" && (
            <>
              {/* Template download */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Step 1 — Download the template
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Fill it in with your exercises, then upload it below.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Template
                </Button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drop your CSV here
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Column reference */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supported columns
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "name *",
                    "category",
                    "sets",
                    "reps",
                    "duration",
                    "rest",
                    "cues",
                    "howTo",
                    "progression",
                    "regression",
                    "notes",
                    "videoUrl",
                  ].map((col) => (
                    <Badge key={col} variant="secondary" className="font-mono text-[10px]">
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  * required · column order doesn&apos;t matter · extra columns are ignored
                </p>
              </div>
            </>
          )}

          {/* ── Stage: preview ───────────────────────────────── */}
          {stage === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {parsed.length} exercise{parsed.length !== 1 ? "s" : ""} ready to import
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Change file
                </button>
              </div>

              {/* Preview table */}
              <div className="max-h-80 overflow-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b border-border bg-secondary/60">
                    <tr>
                      {["Name", "Category", "Sets", "Reps", "Cues"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-semibold text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((ex, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/50 last:border-0 hover:bg-secondary/20"
                      >
                        <td className="px-3 py-2 font-medium text-foreground">
                          {ex.name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {ex.category ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {ex.sets ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {ex.reps ?? "—"}
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                          {ex.cues ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleImport}>
                  Import {parsed.length} Exercise{parsed.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </>
          )}

          {/* ── Stage: importing ─────────────────────────────── */}
          {stage === "importing" && (
            <div className="space-y-4 py-4 text-center">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Importing {progress} of {parsed.length}…
                </p>
                <div className="mx-auto h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress / parsed.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Please keep this window open
                </p>
              </div>
            </div>
          )}

          {/* ── Stage: done ──────────────────────────────────── */}
          {stage === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {successCount} imported successfully
                    {failCount > 0 && `, ${failCount} failed`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Successfully imported exercises are now in your library.
                  </p>
                </div>
              </div>

              {failCount > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-destructive">
                    Failed imports
                  </p>
                  {results
                    .filter((r) => !r.ok)
                    .map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 py-1 text-xs text-destructive"
                      >
                        <X className="h-3 w-3 shrink-0" />
                        {r.name}
                      </div>
                    ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
