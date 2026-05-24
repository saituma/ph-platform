"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Button } from "../../../../../components/ui/button";
import { Badge } from "../../../../../components/ui/badge";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Textarea } from "../../../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../../../components/ui/select";
import { ChevronRight, ClipboardList, Copy, Library, Link2, Plus, Search, Settings, Trash2 } from "lucide-react";
import {
  useGetProgramsQuery,
  useGetProgramModulesQuery,
  useGetModuleSessionsQuery,
  useCreateModuleSessionMutation,
  useUpdateBuilderSessionMutation,
  useDeleteBuilderSessionMutation,
  useGetSessionLibraryQuery,
  useCopySessionToModuleMutation,
  useLinkSessionToModuleMutation,
  useAddRunExerciseMutation,
} from "../../../../../lib/apiSlice";
import { toast } from "@/lib/toast";

type SessionDialog = null | "create" | "edit" | "from-library" | "add-run";

type BuilderModule = { id: number; title?: string | null };
type BuilderProgram = { id: number; name?: string | null };
type BuilderSession = {
  id: number; title?: string | null; description?: string | null;
  weekNumber?: number | null; sessionNumber?: number | null;
  type?: string | null; exerciseCount?: number | null;
  sourceLibrarySessionId?: number | null;
};

const SESSION_TYPES = [
  { label: "Program", value: "program" },
  { label: "Warm-up", value: "warmup" },
  { label: "Cooldown", value: "cooldown" },
  { label: "Stretching", value: "stretching" },
  { label: "Screening", value: "screening" },
  { label: "Core Workout", value: "mobility" },
  { label: "Recovery", value: "recovery" },
  { label: "Offseason", value: "offseason" },
  { label: "In-season", value: "inseason" },
  { label: "Education", value: "education" },
  { label: "Nutrition", value: "nutrition" },
];

const RUN_TYPES = [
  { value: "zone2", label: "Zone 2 (aerobic base)" },
  { value: "easy", label: "Easy run" },
  { value: "tempo", label: "Tempo run" },
  { value: "intervals", label: "Intervals" },
  { value: "sprint", label: "Sprint / repeat sprint" },
] as const;

const SURFACE_TYPES = [
  { value: "outdoor", label: "Outdoor" },
  { value: "treadmill", label: "Treadmill" },
  { value: "either", label: "Either" },
] as const;

type RunForm = {
  runType: "zone2" | "tempo" | "intervals" | "sprint" | "easy";
  durationMins: string;
  distanceKm: string;
  surface: "outdoor" | "treadmill" | "either" | "";
  notes: string;
  weekNumber: string;
  sessionNumber: string;
};

export default function ModuleDetailPage() {
  const params = useParams();
  const programId = Number(params?.programId);
  const moduleId = Number(params?.moduleId);

  const { data: programsData } = useGetProgramsQuery();
  const { data: modulesData } = useGetProgramModulesQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );
  const { data: sessionsData, isLoading, refetch: refetchSessions } = useGetModuleSessionsQuery(
    { moduleId },
    { skip: !Number.isFinite(moduleId) || moduleId <= 0 },
  );

  const [createSession, { isLoading: isCreating }] = useCreateModuleSessionMutation();
  const [updateSession, { isLoading: isUpdating }] = useUpdateBuilderSessionMutation();
  const [deleteSession, { isLoading: isDeletingSession }] = useDeleteBuilderSessionMutation();
  const [copySession, { isLoading: isCopying }] = useCopySessionToModuleMutation();
  const [linkSession, { isLoading: isLinking }] = useLinkSessionToModuleMutation();
  const [addRunExercise, { isLoading: isAddingRun }] = useAddRunExerciseMutation();
  const { data: sessionLibraryData } = useGetSessionLibraryQuery();

  const [dialog, setDialog] = useState<SessionDialog>(null);
  const [editSessionId, setEditSessionId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [sessionNumber, setSessionNumber] = useState("1");
  const [sessionType, setSessionType] = useState("program");
  const [libSearch, setLibSearch] = useState("");

  // Link dialog state
  const [linkTarget, setLinkTarget] = useState<{ id: number; title: string | null } | null>(null);
  const [linkWeek, setLinkWeek] = useState("1");
  const [linkSessionNum, setLinkSessionNum] = useState("1");

  // Run session form
  const defaultRunForm: RunForm = { runType: "zone2", durationMins: "", distanceKm: "", surface: "", notes: "", weekNumber: "1", sessionNumber: "1" };
  const [runForm, setRunForm] = useState<RunForm>(defaultRunForm);

  const program = useMemo(
    () => ((programsData?.programs ?? []) as BuilderProgram[]).find((item) => item.id === programId) ?? null,
    [programsData, programId],
  );
  const currentModule = useMemo(
    () => ((modulesData?.modules ?? []) as BuilderModule[]).find((m) => m.id === moduleId),
    [modulesData, moduleId],
  );
  const sessions: BuilderSession[] = sessionsData?.sessions ?? [];
  const librarySessionsList = sessionLibraryData?.sessions ?? [];
  const isSaving = isCreating || isUpdating || isDeletingSession || isCopying || isLinking;

  const nextSessionNum = sessions.length + 1;
  const currentMaxWeek = sessions.length > 0 ? Math.max(...sessions.map((s) => s.weekNumber ?? 1)) : 1;

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setWeekNumber(String(currentMaxWeek));
    setSessionNumber(String(nextSessionNum));
    setSessionType("program");
    setEditSessionId(null);
    setDialog("create");
  };

  const openEdit = (session: BuilderSession) => {
    setTitle(session.title ?? "");
    setDescription(session.description ?? "");
    setWeekNumber(String(session.weekNumber ?? 1));
    setSessionNumber(String(session.sessionNumber ?? 1));
    setSessionType(session.type ?? "program");
    setEditSessionId(session.id);
    setDialog("edit");
  };

  const openAddRun = () => {
    setRunForm({ ...defaultRunForm, weekNumber: String(currentMaxWeek), sessionNumber: String(nextSessionNum) });
    setDialog("add-run");
  };

  const handleSave = async () => {
    try {
      if (dialog === "edit" && editSessionId) {
        await updateSession({
          sessionId: editSessionId,
          patch: {
            title: title.trim() || null,
            description: description.trim() || null,
            weekNumber: Number(weekNumber),
            sessionNumber: Number(sessionNumber),
            type: sessionType,
          },
        }).unwrap();
        await refetchSessions();
        toast.success("Session updated");
      } else {
        await createSession({
          programId,
          moduleId,
          title: title.trim() || null,
          description: description.trim() || null,
          weekNumber: Number(weekNumber),
          sessionNumber: Number(sessionNumber),
          type: sessionType,
        }).unwrap();
        await refetchSessions();
        toast.success("Session created");
      }
      setDialog(null);
    } catch {
      toast.error(dialog === "edit" ? "Failed to update session" : "Failed to create session");
    }
  };

  const handleCopy = async (sessionId: number) => {
    try {
      await copySession({ moduleId, sessionId, programId }).unwrap();
      await refetchSessions();
      toast.success("Session copied from library");
      setDialog(null);
    } catch {
      toast.error("Failed to copy session");
    }
  };

  const handleOpenLink = (s: any) => {
    setLinkTarget(s);
    setLinkWeek(String(currentMaxWeek));
    setLinkSessionNum(String(nextSessionNum));
  };

  const handleLink = async () => {
    if (!linkTarget) return;
    const wk = parseInt(linkWeek, 10);
    const sn = parseInt(linkSessionNum, 10);
    if (!wk || !sn) { toast.error("Enter valid week and session numbers"); return; }
    try {
      await linkSession({ moduleId, librarySessionId: linkTarget.id, weekNumber: wk, sessionNumber: sn }).unwrap();
      await refetchSessions();
      setLinkTarget(null);
      setDialog(null);
      toast.success(`"${linkTarget.title ?? "Session"}" linked — edits to the library will auto-update here`);
    } catch {
      toast.error("Failed to link session");
    }
  };

  const handleAddRunSession = async () => {
    const wk = parseInt(runForm.weekNumber, 10);
    const sn = parseInt(runForm.sessionNumber, 10);
    if (!wk || !sn) { toast.error("Enter valid week and session numbers"); return; }

    const runLabels: Record<string, string> = {
      zone2: "Zone 2 Run", easy: "Easy Run", tempo: "Tempo Run",
      intervals: "Interval Run", sprint: "Sprint Run",
    };
    const sessionTitle = runLabels[runForm.runType] ?? "Run";

    try {
      const result = await createSession({
        programId, moduleId,
        title: sessionTitle,
        description: null,
        weekNumber: wk,
        sessionNumber: sn,
        type: "program",
      }).unwrap();

      const newSessionId = result?.session?.id;
      if (!newSessionId) throw new Error("No session ID returned");

      const durationSeconds = runForm.durationMins ? Math.round(parseFloat(runForm.durationMins) * 60) : null;
      const distanceMeters = runForm.distanceKm ? Math.round(parseFloat(runForm.distanceKm) * 1000) : null;

      await addRunExercise({
        sessionId: newSessionId,
        runType: runForm.runType,
        durationSeconds: durationSeconds ?? undefined,
        distanceMeters: distanceMeters ?? undefined,
        surface: (runForm.surface || null) as any,
        notes: runForm.notes || null,
      }).unwrap();

      await refetchSessions();
      setDialog(null);
      toast.success(`${sessionTitle} added to module`);
    } catch {
      toast.error("Failed to add run session");
    }
  };

  const handleDelete = async (sessionId: number) => {
    if (!window.confirm("Delete this session and all its exercises?")) return;
    try {
      await deleteSession({ sessionId }).unwrap();
      await refetchSessions();
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  const filteredLibSessions = librarySessionsList.filter((s: any) =>
    !libSearch || (s.title ?? "").toLowerCase().includes(libSearch.toLowerCase()),
  );

  return (
    <AdminShell
      title={currentModule?.title ?? "Module"}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/programs" className="text-muted-foreground hover:text-foreground">Programs</Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link href={`/programs/${programId}`} className="text-muted-foreground hover:text-foreground">
            {program?.name ?? "Program"}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{currentModule?.title ?? "Module"}</span>
        </span>
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAddRun}>
            🏃 Run Session
          </Button>
          <Button variant="outline" onClick={() => { setLibSearch(""); setDialog("from-library"); }}>
            <Library className="mr-1.5 h-4 w-4" /> From Library
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add Session
          </Button>
        </div>
      }
    >
      <SectionHeader
        title="Sessions"
        description={`${sessions.length} session${sessions.length !== 1 ? "s" : ""} in this module.`}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No sessions yet</p>
          <p className="mt-1">Add a blank session, pull from the session library, or drop in a run.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const isLinked = !!(session as any).sourceLibrarySessionId;
            return (
              <Link
                key={session.id}
                href={`/programs/${programId}/modules/${moduleId}/sessions/${session.id}`}
                className={`group rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5 ${isLinked ? "border-primary/30" : "border-border"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {(session.title ?? "").toLowerCase().includes("run") && (
                        <span className="text-base leading-none">🏃</span>
                      )}
                      <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                        {session.title || `Week ${session.weekNumber} · Session ${session.sessionNumber}`}
                      </div>
                    </div>
                    {session.description && (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {session.description}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={isLinked ? "outline" : "secondary"} className={`text-[10px] ${isLinked ? "border-primary/40 text-primary" : ""}`}>
                        {isLinked ? "🔗 Linked" : (SESSION_TYPES.find((t) => t.value === session.type)?.label ?? "Program")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {session.exerciseCount ?? 0} exercise{(session.exerciseCount ?? 0) !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        W{session.weekNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEdit(session);
                      }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                      disabled={isDeletingSession}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create / Edit session dialog */}
      <Dialog open={dialog === "create" || dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Session" : "Add Session"}</DialogTitle>
            <DialogDescription>
              {dialog === "edit" ? "Update session details." : "Create a new blank session in this module."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              placeholder="Session title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Week</label>
                <Input type="number" min={1} value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Session #</label>
                <Input type="number" min={1} value={sessionNumber} onChange={(e) => setSessionNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select items={SESSION_TYPES} value={sessionType} onValueChange={(v) => setSessionType(v ?? "program")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    {SESSION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectPopup>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : dialog === "edit" ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* From Library dialog — Copy or Link */}
      <Dialog open={dialog === "from-library"} onOpenChange={() => { setDialog(null); setLinkTarget(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add from Session Library</DialogTitle>
            <DialogDescription>
              <strong>Copy</strong> makes a standalone snapshot. <strong>Link</strong> keeps it connected — edits to the library update here automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Link confirmation panel */}
          {linkTarget ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="font-semibold text-foreground">{linkTarget.title ?? "Session"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Exercises from this library session will appear here and stay in sync.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Week number</Label>
                  <Input type="number" min={1} value={linkWeek} onChange={(e) => setLinkWeek(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Session number</Label>
                  <Input type="number" min={1} value={linkSessionNum} onChange={(e) => setLinkSessionNum(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setLinkTarget(null)}>← Back</Button>
                <Button size="sm" onClick={handleLink} disabled={isLinking}>
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />
                  {isLinking ? "Linking..." : "Link Session"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search library sessions..."
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                />
              </div>

              {filteredLibSessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {libSearch ? `No sessions matching "${libSearch}"` : "No sessions in the library yet."}
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredLibSessions.map((s: any) => (
                    <div key={s.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{s.title ?? `Session ${s.sessionNumber}`}</p>
                          <p className="text-xs text-muted-foreground">{s.exerciseCount ?? 0} exercise{s.exerciseCount !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            disabled={isCopying}
                            onClick={() => handleCopy(s.id)}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => handleOpenLink(s)}
                          >
                            <Link2 className="h-3 w-3" /> Link
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Run Session dialog */}
      <Dialog open={dialog === "add-run"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🏃 Add Run Session</DialogTitle>
            <DialogDescription>
              Creates a dedicated run session in this module. Athletes see it alongside their gym sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Run type</Label>
              <Select
                items={RUN_TYPES.map((r) => ({ label: r.label, value: r.value }))}
                value={runForm.runType}
                onValueChange={(v) => setRunForm((p) => ({ ...p, runType: v as RunForm["runType"] }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {RUN_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectPopup>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input type="number" min={1} placeholder="e.g. 25" value={runForm.durationMins} onChange={(e) => setRunForm((p) => ({ ...p, durationMins: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Distance (km, optional)</Label>
                <Input type="number" min={0.1} step={0.1} placeholder="e.g. 5" value={runForm.distanceKm} onChange={(e) => setRunForm((p) => ({ ...p, distanceKm: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Surface (optional)</Label>
              <Select
                items={[{ label: "Not specified", value: "" }, ...SURFACE_TYPES.map((s) => ({ label: s.label, value: s.value }))]}
                value={runForm.surface}
                onValueChange={(v) => setRunForm((p) => ({ ...p, surface: v as RunForm["surface"] }))}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="Not specified" /></SelectTrigger>
                <SelectPopup>
                  <SelectItem value="">Not specified</SelectItem>
                  {SURFACE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectPopup>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Coaching notes (optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Stay at conversational pace — nose breathing only"
                value={runForm.notes}
                onChange={(e) => setRunForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Week</Label>
                <Input type="number" min={1} value={runForm.weekNumber} onChange={(e) => setRunForm((p) => ({ ...p, weekNumber: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Session #</Label>
                <Input type="number" min={1} value={runForm.sessionNumber} onChange={(e) => setRunForm((p) => ({ ...p, sessionNumber: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isAddingRun || isCreating}>Cancel</Button>
              <Button onClick={handleAddRunSession} disabled={isAddingRun || isCreating}>
                {isAddingRun || isCreating ? "Adding..." : "Add Run Session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
