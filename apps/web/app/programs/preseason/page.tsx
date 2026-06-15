"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, Edit2, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import {
  useGetPreseasonProgrammesQuery,
  useCreatePreseasonProgrammeMutation,
  useUpdatePreseasonProgrammeMutation,
  useDeletePreseasonProgrammeMutation,
  usePublishPreseasonProgrammeMutation,
  type PreseasonProgramme,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

const TIER_OPTIONS = [
  { value: "", label: "Any Access" },
  { value: "PHP", label: "Basic" },
  { value: "PHP_Premium", label: "Premium" },
  { value: "PHP_Premium_Plus", label: "Premium Plus" },
  { value: "PHP_Pro", label: "Elite" },
];

function tierLabel(tier?: string): string {
  if (!tier) return "Any Access";
  return TIER_OPTIONS.find((o) => o.value === tier)?.label ?? tier;
}

type DialogMode = null | "create" | "edit";

type FormState = {
  title: string;
  description: string;
  weekCount: number;
  requiredTier: string;
};

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  weekCount: 6,
  requiredTier: "",
};

export default function PreseasonPage() {
  const { data, isLoading } = useGetPreseasonProgrammesQuery();
  const [createProgramme, { isLoading: isCreating }] = useCreatePreseasonProgrammeMutation();
  const [updateProgramme, { isLoading: isUpdating }] = useUpdatePreseasonProgrammeMutation();
  const [deleteProgramme, { isLoading: isDeleting }] = useDeletePreseasonProgrammeMutation();
  const [publishProgramme] = usePublishPreseasonProgrammeMutation();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const programmes: PreseasonProgramme[] = data?.programmes ?? [];
  const isSaving = isCreating || isUpdating;

  function openCreate() {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setDialogMode("create");
  }

  function openEdit(p: PreseasonProgramme) {
    setForm({
      title: p.title,
      description: p.description ?? "",
      weekCount: p.weekCount,
      requiredTier: p.requiredTier ?? "",
    });
    setEditingId(p.id);
    setDialogMode("edit");
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    try {
      if (dialogMode === "edit" && editingId !== null) {
        await updateProgramme({
          id: editingId,
          patch: {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            weekCount: form.weekCount,
            requiredTier: form.requiredTier || undefined,
          },
        }).unwrap();
        toast.success("Programme updated");
      } else {
        await createProgramme({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          weekCount: form.weekCount,
          requiredTier: form.requiredTier || undefined,
          athleteType: "adult",
        }).unwrap();
        toast.success("Programme created");
      }
      setDialogMode(null);
    } catch {
      toast.error(dialogMode === "edit" ? "Failed to update programme" : "Failed to create programme");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this programme and all its content? This cannot be undone.")) return;
    try {
      await deleteProgramme({ id }).unwrap();
      toast.success("Programme deleted");
    } catch {
      toast.error("Failed to delete programme");
    }
  }

  async function handlePublishToggle(p: PreseasonProgramme) {
    try {
      await publishProgramme({ id: p.id, isPublished: !p.isPublished }).unwrap();
      toast.success(p.isPublished ? "Programme unpublished" : "Programme published");
    } catch {
      toast.error("Failed to update publish status");
    }
  }

  return (
    <AdminShell
      title="Pre-Season Programmes"
      subtitle="Build and manage pre-season training blocks."
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Programme
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      ) : programmes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <CalendarRange className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No programmes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click "New Programme" to create your first pre-season block.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {programmes.map((p) => (
            <ProgrammeCard
              key={p.id}
              programme={p}
              isDeleting={isDeleting}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
              onPublishToggle={() => handlePublishToggle(p)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? "Edit Programme" : "New Programme"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Update this programme's details."
                : "Create a new pre-season programme block."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4 px-6 pb-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input
                placeholder="e.g. Pre-Season Phase 1"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Optional overview of this programme..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Week Count</label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={form.weekCount}
                  onChange={(e) => setField("weekCount", Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Required Tier</label>
                <select
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-ring/24 transition-shadow focus-visible:border-ring focus-visible:ring-[3px]"
                  value={form.requiredTier}
                  onChange={(e) => setField("requiredTier", e.target.value)}
                >
                  {TIER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogMode(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !form.title.trim()}>
                {isSaving ? "Saving..." : dialogMode === "edit" ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

type ProgrammeCardProps = {
  programme: PreseasonProgramme;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPublishToggle: () => void;
};

function ProgrammeCard({ programme, isDeleting, onEdit, onDelete, onPublishToggle }: ProgrammeCardProps) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card transition hover:border-border/80">
      <Link
        href={`/programs/preseason/${programme.id}`}
        className="flex-1 p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {programme.title}
          </h3>
          {programme.isPublished ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              Live
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Draft
            </span>
          )}
        </div>

        {programme.description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{programme.description}</p>
        )}

        <div className="flex items-center gap-2">
          <Badge variant="outline" size="sm">
            {programme.weekCount} {programme.weekCount === 1 ? "Week" : "Weeks"}
          </Badge>
          {programme.requiredTier && (
            <Badge variant="secondary" size="sm">
              {tierLabel(programme.requiredTier)}
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-1 border-t border-border px-4 py-2.5">
        <button
          type="button"
          onClick={onPublishToggle}
          className="flex-1 text-left text-xs text-muted-foreground transition hover:text-foreground"
        >
          {programme.isPublished ? "Unpublish" : "Publish"}
        </button>
        <button
          type="button"
          aria-label="Edit programme"
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Delete programme"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
