"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { AdminShell } from "../../../../components/admin/shell";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../../components/ui/dialog";
import {
  useGetPreseasonProgrammeFullQuery,
  usePublishPreseasonProgrammeMutation,
  useCreatePreseasonWeekMutation,
  useDeletePreseasonWeekMutation,
  useCreatePreseasonWeekTypeMutation,
  useDeletePreseasonWeekTypeMutation,
  useCreatePreseasonDaySessionMutation,
  useUpdatePreseasonDaySessionMutation,
  useDeletePreseasonDaySessionMutation,
  useAddPreseasonExerciseMutation,
  useUpdatePreseasonExerciseMutation,
  useDeletePreseasonExerciseMutation,
  useReorderPreseasonExercisesMutation,
  useGetExercisesForPreseasonQuery,
  useGetPreseasonAssignmentsQuery,
  useAssignPreseasonAthletesMutation,
  useUnassignPreseasonAthleteMutation,
  useSearchPreseasonAthletesQuery,
  type PreseasonWeek,
  type PreseasonWeekType,
  type PreseasonDaySession,
  type PreseasonExercise,
} from "../../../../lib/apiSlice";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["", "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const CATEGORIES = [
  "PRIMER",
  "GAME",
  "RECOVERY",
  "STRENGTH",
  "SPEED",
  "CONDITIONING",
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_STYLES: Record<Category, string> = {
  PRIMER: "bg-amber-500/20 text-amber-400",
  GAME: "bg-orange-500/20 text-orange-400",
  RECOVERY: "bg-blue-500/20 text-blue-400",
  STRENGTH: "bg-purple-500/20 text-purple-400",
  SPEED: "bg-green-500/20 text-green-400",
  CONDITIONING: "bg-cyan-500/20 text-cyan-400",
};

function categoryStyle(cat: string): string {
  return CATEGORY_STYLES[cat as Category] ?? "bg-zinc-500/20 text-zinc-400";
}

export default function PreseasonBuilderPage() {
  const params = useParams();
  const programmeId = Number(params?.programmeId);
  const isValidId = Number.isFinite(programmeId) && programmeId > 0;

  const { data, isLoading } = useGetPreseasonProgrammeFullQuery(
    { id: programmeId },
    { skip: !isValidId },
  );

  const [publishProgramme] = usePublishPreseasonProgrammeMutation();
  const [createWeek, { isLoading: isAddingWeek }] = useCreatePreseasonWeekMutation();
  const [deleteWeek] = useDeletePreseasonWeekMutation();
  const [createWeekType, { isLoading: isAddingWeekType }] = useCreatePreseasonWeekTypeMutation();
  const [deleteWeekType] = useDeletePreseasonWeekTypeMutation();

  const programme = data?.programme ?? null;
  const weeks: PreseasonWeek[] = programme?.weeks ?? [];

  const [activeTab, setActiveTab] = useState<"builder" | "athletes">("builder");
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedWeekTypeId, setSelectedWeekTypeId] = useState<number | null>(null);

  useEffect(() => {
    if (weeks.length > 0 && selectedWeekId === null) {
      const first = weeks[0];
      setSelectedWeekId(first.id);
      if (first.weekTypes.length > 0) {
        setSelectedWeekTypeId(first.weekTypes[0].id);
      }
    }
  }, [weeks, selectedWeekId]);

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) ?? null;
  const selectedWeekType = selectedWeek?.weekTypes.find((wt) => wt.id === selectedWeekTypeId) ?? null;

  async function handleAddWeek() {
    if (!programme) return;
    try {
      const nextNumber = weeks.length + 1;
      const result = await createWeek({
        programmeId: programme.id,
        weekNumber: nextNumber,
      }).unwrap();
      setSelectedWeekId(result.week.id);
      setSelectedWeekTypeId(null);
      toast.success(`Week ${nextNumber} added`);
    } catch {
      toast.error("Failed to add week");
    }
  }

  async function handleDeleteWeek(weekId: number) {
    if (!window.confirm("Delete this week and all its content?")) return;
    try {
      await deleteWeek({ id: weekId }).unwrap();
      if (selectedWeekId === weekId) {
        setSelectedWeekId(null);
        setSelectedWeekTypeId(null);
      }
      toast.success("Week deleted");
    } catch {
      toast.error("Failed to delete week");
    }
  }

  async function handleAddWeekType(weekId: number) {
    const name = window.prompt("Week type name (e.g. Tuesday Game Week):");
    if (!name?.trim()) return;
    try {
      const existingCount = selectedWeek?.weekTypes.length ?? 0;
      const result = await createWeekType({
        weekId,
        name: name.trim(),
        order: existingCount + 1,
      }).unwrap();
      setSelectedWeekTypeId(result.weekType.id);
      toast.success("Week type added");
    } catch {
      toast.error("Failed to add week type");
    }
  }

  async function handleDeleteWeekType(id: number) {
    if (!window.confirm("Delete this week type and all its sessions?")) return;
    try {
      await deleteWeekType({ id }).unwrap();
      if (selectedWeekTypeId === id) {
        setSelectedWeekTypeId(null);
      }
      toast.success("Week type deleted");
    } catch {
      toast.error("Failed to delete week type");
    }
  }

  async function handlePublishToggle() {
    if (!programme) return;
    try {
      await publishProgramme({ id: programme.id, isPublished: !programme.isPublished }).unwrap();
      toast.success(programme.isPublished ? "Programme unpublished" : "Programme published");
    } catch {
      toast.error("Failed to update publish status");
    }
  }

  if (!isValidId) {
    return (
      <AdminShell title="Not Found" subtitle="Programme not found.">
        <Link href="/programs/preseason" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Programmes
        </Link>
      </AdminShell>
    );
  }

  if (isLoading) {
    return (
      <AdminShell title="Pre-Season" subtitle="Loading...">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      </AdminShell>
    );
  }

  if (!programme) {
    return (
      <AdminShell title="Not Found" subtitle="Programme not found.">
        <Link href="/programs/preseason" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Programmes
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={programme.title}
      subtitle={
        <span className="flex items-center gap-2">
          <Link href="/programs/preseason" className="text-muted-foreground hover:text-foreground transition-colors">
            Pre-Season
          </Link>
          <span className="text-muted-foreground">/</span>
          <span>{programme.title}</span>
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePublishToggle}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition",
              programme.isPublished
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                programme.isPublished ? "bg-emerald-400" : "bg-zinc-500",
              )}
            />
            {programme.isPublished ? "Live" : "Draft"}
          </button>
          <Link href="/programs/preseason">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        </div>
      }
    >
      {/* Top-level tab switcher */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("builder")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold tracking-wide transition",
            activeTab === "builder"
              ? "bg-foreground text-background"
              : "text-zinc-400 hover:text-foreground",
          )}
        >
          Builder
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("athletes")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold tracking-wide transition",
            activeTab === "athletes"
              ? "bg-foreground text-background"
              : "text-zinc-400 hover:text-foreground",
          )}
        >
          <Users className="h-3 w-3" />
          Athletes
        </button>
      </div>

      {activeTab === "builder" ? (
        <div className="flex min-h-[calc(100vh-16rem)] gap-0 overflow-hidden rounded-2xl border border-border">
          {/* Left: Week selector */}
          <aside className="flex w-48 shrink-0 flex-col border-r border-border bg-card">
            <div className="border-b border-border px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Weeks
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {weeks.map((week) => (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => {
                    setSelectedWeekId(week.id);
                    const firstType = week.weekTypes[0];
                    setSelectedWeekTypeId(firstType?.id ?? null);
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between px-3 py-2.5 text-left transition",
                    selectedWeekId === week.id
                      ? "bg-primary/8 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <span className="text-xs font-semibold tracking-wide">
                    WEEK {week.weekNumber}
                  </span>
                  <button
                    type="button"
                    aria-label="Delete week"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWeek(week.id);
                    }}
                    className="invisible h-4 w-4 shrink-0 text-muted-foreground/60 transition hover:text-destructive group-hover:visible"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={handleAddWeek}
                disabled={isAddingWeek}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Week
              </button>
            </div>
          </aside>

          {/* Right: Content */}
          <div className="flex min-w-0 flex-1 flex-col bg-background">
            {selectedWeek === null ? (
              <div className="flex flex-1 items-center justify-center p-12 text-center text-sm text-muted-foreground">
                {weeks.length === 0
                  ? 'No weeks yet — click "Add Week" to start.'
                  : "Select a week on the left."}
              </div>
            ) : (
              <>
                {/* Week-type tabs */}
                <div className="flex items-center gap-0 overflow-x-auto border-b border-border">
                  {selectedWeek.weekTypes.map((wt) => (
                    <button
                      key={wt.id}
                      type="button"
                      onClick={() => setSelectedWeekTypeId(wt.id)}
                      className={cn(
                        "group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition",
                        selectedWeekTypeId === wt.id
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {wt.name}
                      <button
                        type="button"
                        aria-label="Delete week type"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWeekType(wt.id);
                        }}
                        className="invisible h-3.5 w-3.5 text-muted-foreground/60 transition hover:text-destructive group-hover:visible"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddWeekType(selectedWeek.id)}
                    disabled={isAddingWeekType}
                    className="flex shrink-0 items-center gap-1 border-b-2 border-transparent px-4 py-3 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Week Type
                  </button>
                </div>

                {/* Day sessions */}
                {selectedWeekType === null ? (
                  <div className="flex flex-1 items-center justify-center p-12 text-center text-sm text-muted-foreground">
                    {selectedWeek.weekTypes.length === 0
                      ? 'No week types — click "+ Add Week Type" above.'
                      : "Select a week type above."}
                  </div>
                ) : (
                  <WeekTypePanel
                    weekType={selectedWeekType}
                    programmeId={programme.id}
                  />
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <AthletesPanel programmeId={programme.id} />
      )}
    </AdminShell>
  );
}

function AthletesPanel({ programmeId }: { programmeId: number }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: assignmentsData, isLoading: isLoadingAssignments } =
    useGetPreseasonAssignmentsQuery({ programmeId });

  const { data: searchData, isFetching: isSearching } = useSearchPreseasonAthletesQuery(
    { q: debouncedQ },
    { skip: debouncedQ.trim() === "" },
  );

  const [assignAthletes, { isLoading: isAssigning }] = useAssignPreseasonAthletesMutation();
  const [unassignAthlete] = useUnassignPreseasonAthleteMutation();

  const assignments = assignmentsData?.assignments ?? [];
  const assignedIds = new Set(assignments.map((a) => a.athleteId));
  const searchResults = searchData?.athletes ?? [];

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchTerm(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
    }, 300);
  }

  async function handleAdd(athleteId: number) {
    try {
      await assignAthletes({ programmeId, athleteIds: [athleteId] }).unwrap();
      toast.success("Athlete added");
    } catch {
      toast.error("Failed to add athlete");
    }
  }

  async function handleRemove(athleteId: number) {
    try {
      await unassignAthlete({ programmeId, athleteId }).unwrap();
      toast.success("Athlete removed");
    } catch {
      toast.error("Failed to remove athlete");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Assigned Athletes */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <p className="text-xs font-medium tracking-widest text-zinc-500 uppercase">
            Assigned Athletes
          </p>
          {assignments.length > 0 && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              {assignments.length}
            </span>
          )}
        </div>

        {isLoadingAssignments ? (
          <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : assignments.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">No athletes assigned yet</p>
        ) : (
          <ul>
            {assignments.map((a) => (
              <li
                key={a.athleteId}
                className="flex items-center gap-3 border-b border-zinc-800 py-2.5 last:border-0"
              >
                <span className="text-sm text-white">{a.athleteName}</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {a.athleteType}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${a.athleteName}`}
                  onClick={() => handleRemove(a.athleteId)}
                  className="ml-auto text-zinc-600 transition hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Athletes */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-4 text-xs font-medium tracking-widest text-zinc-500 uppercase">
          Add Athletes
        </p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8"
            placeholder="Search athletes…"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {debouncedQ.trim() === "" ? (
          <p className="py-6 text-center text-xs text-zinc-500">Search by name to find athletes</p>
        ) : isSearching ? (
          <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        ) : searchResults.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">No athletes found</p>
        ) : (
          <ul>
            {searchResults.map((athlete) => {
              const alreadyAssigned = assignedIds.has(athlete.id);
              return (
                <li
                  key={athlete.id}
                  className="flex items-center gap-3 border-b border-zinc-800 py-2.5 last:border-0"
                >
                  <span className="text-sm text-white">{athlete.name}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                    {athlete.athleteType}
                  </span>
                  <button
                    type="button"
                    disabled={alreadyAssigned || isAssigning}
                    onClick={() => handleAdd(athlete.id)}
                    className="ml-auto rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-30"
                  >
                    {alreadyAssigned ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

type WeekTypePanelProps = {
  weekType: PreseasonWeekType;
  programmeId: number;
};

function WeekTypePanel({ weekType, programmeId }: WeekTypePanelProps) {
  const [createDaySession] = useCreatePreseasonDaySessionMutation();

  const daySlots = Array.from({ length: 7 }, (_, i) => {
    const dayOfWeek = i + 1;
    const session = weekType.daySessions.find((s) => s.dayOfWeek === dayOfWeek) ?? null;
    return { dayOfWeek, session };
  });

  async function handleAddSession(dayOfWeek: number) {
    try {
      await createDaySession({
        weekTypeId: weekType.id,
        dayOfWeek,
        category: "PRIMER",
        title: `${DAY_NAMES[dayOfWeek]} Session`,
      }).unwrap();
    } catch {
      toast.error("Failed to add session");
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-border">
        {daySlots.map(({ dayOfWeek, session }) => (
          <DaySlot
            key={dayOfWeek}
            dayOfWeek={dayOfWeek}
            session={session}
            onAdd={() => handleAddSession(dayOfWeek)}
            programmeId={programmeId}
          />
        ))}
      </div>
    </div>
  );
}

type DaySlotProps = {
  dayOfWeek: number;
  session: PreseasonDaySession | null;
  onAdd: () => void;
  programmeId: number;
};

function DaySlot({ dayOfWeek, session, onAdd }: DaySlotProps) {
  const [expanded, setExpanded] = useState(true);
  const [deleteSession] = useDeletePreseasonDaySessionMutation();
  const [updateSession] = useUpdatePreseasonDaySessionMutation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addExercise] = useAddPreseasonExerciseMutation();

  const dayName = DAY_NAMES[dayOfWeek] ?? `DAY ${dayOfWeek}`;

  async function handleDeleteSession() {
    if (!session) return;
    if (!window.confirm(`Delete ${dayName} session?`)) return;
    try {
      await deleteSession({ id: session.id }).unwrap();
    } catch {
      toast.error("Failed to delete session");
    }
  }

  async function handleAddExercise(exerciseId: number) {
    if (!session) return;
    try {
      await addExercise({
        daySessionId: session.id,
        exerciseId,
        order: (session.exercises?.length ?? 0) + 1,
        metric: "reps",
      }).unwrap();
      setPickerOpen(false);
    } catch {
      toast.error("Failed to add exercise");
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex w-10 shrink-0 flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {dayName}
          </span>
        </div>

        {session === null ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add session
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CategorySelect
                value={session.category}
                onChange={(cat) =>
                  updateSession({ id: session.id, patch: { category: cat } })
                }
              />
              <AutosaveInput
                className="flex-1 text-sm font-medium"
                value={session.title}
                placeholder="Session title"
                onSave={(val) =>
                  updateSession({ id: session.id, patch: { title: val } })
                }
              />
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Delete session"
                onClick={handleDeleteSession}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {expanded && (
              <div className="mt-3 space-y-2 pl-0">
                {/* Exercises */}
                <div className="space-y-2">
                  {(session.exercises ?? []).map((ex, idx) => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      index={idx}
                      totalCount={session.exercises.length}
                      sessionId={session.id}
                      allExercises={session.exercises}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-border/80 hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Exercise
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddExercise}
      />
    </div>
  );
}

type ExerciseRowProps = {
  exercise: PreseasonExercise;
  index: number;
  totalCount: number;
  sessionId: number;
  allExercises: PreseasonExercise[];
};

function ExerciseRow({ exercise, index, totalCount, sessionId, allExercises }: ExerciseRowProps) {
  const [updateExercise] = useUpdatePreseasonExerciseMutation();
  const [deleteExercise] = useDeletePreseasonExerciseMutation();
  const [reorderExercises] = useReorderPreseasonExercisesMutation();

  async function handleDelete() {
    try {
      await deleteExercise({ id: exercise.id }).unwrap();
    } catch {
      toast.error("Failed to delete exercise");
    }
  }

  async function handleMove(direction: "up" | "down") {
    const ids = allExercises.map((e) => e.id);
    const currentIdx = ids.indexOf(exercise.id);
    if (direction === "up" && currentIdx <= 0) return;
    if (direction === "down" && currentIdx >= ids.length - 1) return;
    const newIds = [...ids];
    const swapIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    [newIds[currentIdx], newIds[swapIdx]] = [newIds[swapIdx], newIds[currentIdx]];
    try {
      await reorderExercises({ daySessionId: sessionId, orderedIds: newIds }).unwrap();
    } catch {
      toast.error("Failed to reorder exercises");
    }
  }

  const isReps = exercise.metric === "reps";

  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card/50 p-3">
      <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => handleMove("up")}
          className="flex h-5 w-5 items-center justify-center text-muted-foreground/60 transition hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === totalCount - 1}
          onClick={() => handleMove("down")}
          className="flex h-5 w-5 items-center justify-center text-muted-foreground/60 transition hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            {exercise.exercise?.name ?? exercise.name}
          </span>
          {exercise.exercise?.category && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {exercise.exercise.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric toggle */}
          <div className="flex overflow-hidden rounded-md border border-border text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => updateExercise({ id: exercise.id, patch: { metric: "reps" } })}
              className={cn(
                "px-2 py-1 transition",
                isReps
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              REPS
            </button>
            <button
              type="button"
              onClick={() => updateExercise({ id: exercise.id, patch: { metric: "duration" } })}
              className={cn(
                "px-2 py-1 transition",
                !isReps
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              TIME
            </button>
          </div>

          <InlineNumberField
            label="Sets"
            value={exercise.setsOverride ?? exercise.exercise?.sets ?? null}
            onChange={(v) => updateExercise({ id: exercise.id, patch: { setsOverride: v } })}
          />

          {isReps ? (
            <InlineNumberField
              label="Reps"
              value={exercise.repsOverride ?? exercise.exercise?.reps ?? null}
              onChange={(v) => updateExercise({ id: exercise.id, patch: { repsOverride: v } })}
            />
          ) : (
            <InlineNumberField
              label="Sec"
              value={exercise.durationOverride ?? exercise.exercise?.duration ?? null}
              onChange={(v) => updateExercise({ id: exercise.id, patch: { durationOverride: v } })}
            />
          )}

          <AutosaveInput
            value={exercise.notes ?? ""}
            placeholder="Notes"
            onSave={(val) =>
              updateExercise({ id: exercise.id, patch: { notes: val || null } })
            }
            className="flex-1 text-xs"
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="Remove exercise"
        onClick={handleDelete}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground/60 transition hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

type CategorySelectProps = {
  value: string;
  onChange: (val: string) => void;
};

function CategorySelect({ value, onChange }: CategorySelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none rounded-full border-0 pr-1 pl-2 py-0.5 text-[10px] font-bold uppercase tracking-wide outline-none cursor-pointer",
          categoryStyle(value),
        )}
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}

type AutosaveInputProps = {
  value: string;
  placeholder?: string;
  onSave: (val: string) => void;
  className?: string;
  label?: string;
};

function AutosaveInput({ value, placeholder, onSave, className, label }: AutosaveInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocal(val);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSave(val);
      }, 600);
    },
    [onSave],
  );

  const handleBlur = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onSave(local);
  }, [local, onSave]);

  return (
    <div className={cn("flex flex-col gap-0.5", label ? "" : "")}>
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <Input
        value={local}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn("h-7 border-border/60 bg-transparent", className)}
      />
    </div>
  );
}

type InlineNumberFieldProps = {
  label: string;
  value: number | null | undefined;
  onChange: (val: number | null) => void;
};

function InlineNumberField({ label, value, onChange }: InlineNumberFieldProps) {
  const [local, setLocal] = useState(value != null ? String(value) : "");

  useEffect(() => {
    setLocal(value != null ? String(value) : "");
  }, [value]);

  function handleBlur() {
    const n = local === "" ? null : Number(local);
    onChange(Number.isNaN(n) ? null : n);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        className="h-6 w-12 rounded border border-border/60 bg-transparent px-1.5 text-xs text-foreground outline-none focus:border-ring"
      />
    </div>
  );
}

type ExercisePickerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (exerciseId: number) => void;
};

function ExercisePickerDialog({ open, onClose, onSelect }: ExercisePickerDialogProps) {
  const { data } = useGetExercisesForPreseasonQuery(undefined, { skip: !open });
  const [search, setSearch] = useState("");

  const exercises: any[] = data?.exercises ?? [];
  const filtered = search
    ? exercises.filter((e) =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase()),
      )
    : exercises;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>Pick from the exercise library.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-3 mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {search ? "No exercises match your search." : "No exercises in library."}
              </p>
            ) : (
              filtered.map((ex: any) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    onSelect(ex.id);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition hover:border-border/80 hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{ex.name}</p>
                    {ex.category && (
                      <p className="text-[10px] text-muted-foreground">{ex.category}</p>
                    )}
                  </div>
                  {(ex.sets || ex.reps || ex.duration) && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {ex.sets && `${ex.sets}×`}
                      {ex.reps ? `${ex.reps} reps` : ex.duration ? `${ex.duration}s` : ""}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
