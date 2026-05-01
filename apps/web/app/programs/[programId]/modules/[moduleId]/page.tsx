"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Button } from "../../../../../components/ui/button";
import { Badge } from "../../../../../components/ui/badge";
import { Input } from "../../../../../components/ui/input";
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
import { ChevronRight, ClipboardList, Plus, Settings, Trash2 } from "lucide-react";
import {
  useGetProgramFullQuery,
  useGetModuleSessionsQuery,
  useCreateModuleSessionMutation,
  useUpdateBuilderSessionMutation,
  useDeleteBuilderSessionMutation,
} from "../../../../../lib/apiSlice";

type SessionDialog = null | "create" | "edit";

const SESSION_TYPES = [
  { label: "Program", value: "program" },
  { label: "Assessment", value: "assessment" },
  { label: "Recovery", value: "recovery" },
];

export default function ModuleDetailPage() {
  const params = useParams();
  const programId = Number(params?.programId);
  const moduleId = Number(params?.moduleId);

  const { data: fullData } = useGetProgramFullQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );
  const { data: sessionsData, isLoading } = useGetModuleSessionsQuery(
    { moduleId },
    { skip: !Number.isFinite(moduleId) || moduleId <= 0 },
  );

  const [createSession, { isLoading: isCreating }] = useCreateModuleSessionMutation();
  const [updateSession, { isLoading: isUpdating }] = useUpdateBuilderSessionMutation();
  const [deleteSession, { isLoading: isDeletingSession }] = useDeleteBuilderSessionMutation();

  const [dialog, setDialog] = useState<SessionDialog>(null);
  const [editSessionId, setEditSessionId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [sessionNumber, setSessionNumber] = useState("1");
  const [sessionType, setSessionType] = useState("program");

  const program = fullData?.program ?? null;
  const currentModule = useMemo(
    () => (program?.modules ?? []).find((m: any) => m.id === moduleId),
    [program, moduleId],
  );
  const sessions = sessionsData?.sessions ?? [];
  const isSaving = isCreating || isUpdating || isDeletingSession;

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setWeekNumber(String((sessions.length > 0 ? Math.max(...sessions.map((s: any) => s.weekNumber ?? 1)) : 1)));
    setSessionNumber(String(sessions.length + 1));
    setSessionType("program");
    setEditSessionId(null);
    setDialog("create");
  };

  const openEdit = (session: any) => {
    setTitle(session.title ?? "");
    setDescription(session.description ?? "");
    setWeekNumber(String(session.weekNumber ?? 1));
    setSessionNumber(String(session.sessionNumber ?? 1));
    setSessionType(session.type ?? "program");
    setEditSessionId(session.id);
    setDialog("edit");
  };

  const handleSave = async () => {
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
    }
    setDialog(null);
  };

  const handleDelete = async (sessionId: number) => {
    if (!window.confirm("Delete this session and all its exercises?")) return;
    await deleteSession({ sessionId }).unwrap();
  };

  return (
    <AdminShell
      title={currentModule?.title ?? "Module"}
      subtitle={
        <span className="flex items-center gap-2 text-xs">
          <Link href="/programs" className="text-muted-foreground hover:text-foreground">
            Programs
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <Link href={`/programs/${programId}`} className="text-muted-foreground hover:text-foreground">
            {program?.name ?? "Program"}
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{currentModule?.title ?? "Module"}</span>
        </span>
      }
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add Session
        </Button>
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
          <p className="mt-1">Click "Add Session" to create your first session.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session: any) => (
            <Link
              key={session.id}
              href={`/programs/${programId}/modules/${moduleId}/sessions/${session.id}`}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {session.title || `Week ${session.weekNumber} · Session ${session.sessionNumber}`}
                  </div>
                  {session.description && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {session.description}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {session.type ?? "program"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {session.exerciseCount ?? 0} exercise{(session.exerciseCount ?? 0) !== 1 ? "s" : ""}
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
          ))}
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Session" : "Add Session"}</DialogTitle>
            <DialogDescription>
              {dialog === "edit" ? "Update session details." : "Create a new session in this module."}
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
                <Input
                  type="number"
                  min={1}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Session #</label>
                <Input
                  type="number"
                  min={1}
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <Select
                  items={SESSION_TYPES}
                  value={sessionType}
                  onValueChange={(v) => setSessionType(v ?? "program")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    {SESSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : dialog === "edit" ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
