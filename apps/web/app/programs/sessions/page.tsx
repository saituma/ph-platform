"use client";

import { useState } from "react";
import Link from "next/link";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { ClipboardList, Plus, Settings, Trash2 } from "lucide-react";
import {
  useGetSessionLibraryQuery,
  useCreateLibrarySessionMutation,
  useUpdateBuilderSessionMutation,
  useDeleteBuilderSessionMutation,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

type LibrarySession = {
  id: number;
  title?: string | null;
  description?: string | null;
  type?: string | null;
  weekNumber?: number | null;
  sessionNumber?: number | null;
  exerciseCount?: number | null;
};

type SessionDialog = null | "create" | "edit";

const SESSION_TYPES = [
  { label: "Program", value: "program" },
  { label: "Warm-up", value: "warmup" },
  { label: "Cooldown", value: "cooldown" },
  { label: "Stretching", value: "stretching" },
  { label: "Screening", value: "screening" },
  { label: "Mobility", value: "mobility" },
  { label: "Recovery", value: "recovery" },
  { label: "Offseason", value: "offseason" },
  { label: "In-season", value: "inseason" },
  { label: "Education", value: "education" },
  { label: "Nutrition", value: "nutrition" },
];

export default function SessionLibraryPage() {
  const { data, isLoading, refetch } = useGetSessionLibraryQuery();
  const [createSession, { isLoading: isCreating }] = useCreateLibrarySessionMutation();
  const [updateSession, { isLoading: isUpdating }] = useUpdateBuilderSessionMutation();
  const [deleteSession, { isLoading: isDeleting }] = useDeleteBuilderSessionMutation();

  const [dialog, setDialog] = useState<SessionDialog>(null);
  const [editSessionId, setEditSessionId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState("program");

  const sessions: LibrarySession[] = data?.sessions ?? [];
  const isSaving = isCreating || isUpdating || isDeleting;

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setSessionType("program");
    setEditSessionId(null);
    setDialog("create");
  };

  const openEdit = (s: LibrarySession) => {
    setTitle(s.title ?? "");
    setDescription(s.description ?? "");
    setSessionType(s.type ?? "program");
    setEditSessionId(s.id);
    setDialog("edit");
  };

  const handleSave = async () => {
    try {
      if (dialog === "edit" && editSessionId) {
        await updateSession({
          sessionId: editSessionId,
          patch: { title: title.trim() || null, description: description.trim() || null, type: sessionType },
        }).unwrap();
        toast.success("Session updated");
      } else {
        await createSession({
          title: title.trim() || null,
          description: description.trim() || null,
          type: sessionType,
        }).unwrap();
        toast.success("Session created");
      }
      await refetch();
      setDialog(null);
    } catch {
      toast.error(dialog === "edit" ? "Failed to update session" : "Failed to create session");
    }
  };

  const handleDelete = async (sessionId: number) => {
    if (!window.confirm("Delete this session and all its exercises?")) return;
    try {
      await deleteSession({ sessionId }).unwrap();
      await refetch();
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  return (
    <AdminShell
      title="Session Library"
      subtitle="Reusable sessions you can copy into modules or teams."
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New Session
        </Button>
      }
    >
      <SectionHeader
        title="Library Sessions"
        description={`${sessions.length} session${sessions.length !== 1 ? "s" : ""} available to reuse.`}
      />

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No sessions in library</p>
          <p className="mt-1">Create a session once and reuse it across modules and teams.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/programs/sessions/${s.id}`}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {s.title || `Session ${s.sessionNumber ?? 1}`}
                  </div>
                  {s.description && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{s.type ?? "program"}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {s.exerciseCount ?? 0} exercise{(s.exerciseCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(s); }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(s.id); }}
                    disabled={isDeleting}
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
            <DialogTitle>{dialog === "edit" ? "Edit Session" : "New Library Session"}</DialogTitle>
            <DialogDescription>
              {dialog === "edit"
                ? "Update this session's details."
                : "Create a reusable session, add exercises to it, then copy it into any module or team."}
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
            <Select items={SESSION_TYPES} value={sessionType} onValueChange={(v) => setSessionType(v ?? "program")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                {SESSION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : dialog === "edit" ? "Save Changes" : "Create Session"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
