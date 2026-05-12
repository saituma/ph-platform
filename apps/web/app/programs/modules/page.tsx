"use client";

import { useState } from "react";
import Link from "next/link";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Layers, Plus, Settings, Trash2 } from "lucide-react";
import {
  useGetModuleLibraryQuery,
  useCreateLibraryModuleMutation,
  useUpdateLibraryModuleMutation,
  useDeleteLibraryModuleMutation,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

type LibraryModule = {
  id: number;
  title: string;
  description?: string | null;
  sessionCount?: number | null;
};

type ModuleDialog = null | "create" | "edit";

export default function ModuleLibraryPage() {
  const { data, isLoading, refetch } = useGetModuleLibraryQuery();
  const [createModule, { isLoading: isCreating }] = useCreateLibraryModuleMutation();
  const [updateModule, { isLoading: isUpdating }] = useUpdateLibraryModuleMutation();
  const [deleteModule, { isLoading: isDeleting }] = useDeleteLibraryModuleMutation();

  const [dialog, setDialog] = useState<ModuleDialog>(null);
  const [editModuleId, setEditModuleId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const modules: LibraryModule[] = data?.modules ?? [];
  const isSaving = isCreating || isUpdating || isDeleting;

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setEditModuleId(null);
    setDialog("create");
  };

  const openEdit = (mod: LibraryModule) => {
    setTitle(mod.title ?? "");
    setDescription(mod.description ?? "");
    setEditModuleId(mod.id);
    setDialog("edit");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    try {
      if (dialog === "edit" && editModuleId) {
        await updateModule({
          moduleId: editModuleId,
          patch: { title: title.trim(), description: description.trim() || null },
        }).unwrap();
        toast.success("Module updated");
      } else {
        await createModule({
          title: title.trim(),
          description: description.trim() || null,
        }).unwrap();
        toast.success("Module created");
      }
      await refetch();
      setDialog(null);
    } catch {
      toast.error(dialog === "edit" ? "Failed to update module" : "Failed to create module");
    }
  };

  const handleDelete = async (moduleId: number) => {
    if (!window.confirm("Delete this module and all its sessions?")) return;
    try {
      await deleteModule({ moduleId }).unwrap();
      await refetch();
      toast.success("Module deleted");
    } catch {
      toast.error("Failed to delete module");
    }
  };

  return (
    <AdminShell
      title="Module Library"
      subtitle="Reusable modules you can copy into any program."
      actions={
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New Module
        </Button>
      }
    >
      <SectionHeader
        title="Library Modules"
        description={`${modules.length} module${modules.length !== 1 ? "s" : ""} available to reuse.`}
      />

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No modules in library</p>
          <p className="mt-1">Create a module once and reuse it across multiple programs.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod) => (
            <Link
              key={mod.id}
              href={`/programs/modules/${mod.id}`}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary">
                    {mod.title}
                  </div>
                  {mod.description && (
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {mod.description}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {mod.sessionCount ?? 0} session{(mod.sessionCount ?? 0) !== 1 ? "s" : ""}
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
                      openEdit(mod);
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
                      handleDelete(mod.id);
                    }}
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
            <DialogTitle>{dialog === "edit" ? "Edit Module" : "New Library Module"}</DialogTitle>
            <DialogDescription>
              {dialog === "edit"
                ? "Update this module's details."
                : "Create a reusable module to add sessions and exercises to, then copy it into programs."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input
              placeholder="Module title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
                {isSaving ? "Saving..." : dialog === "edit" ? "Save Changes" : "Create Module"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
