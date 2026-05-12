"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { ChevronRight, Copy, Layers, Plus, Settings, Trash2 } from "lucide-react";
import {
  useGetProgramsQuery,
  useGetProgramModulesQuery,
  useCreateProgramModuleMutation,
  useUpdateProgramModuleMutation,
  useDeleteProgramModuleMutation,
  useGetModuleLibraryQuery,
  useCopyModuleToProgramMutation,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

type ModuleDialog = null | "create" | "edit" | "library";

type ProgramSummary = {
  id: number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
};

type ProgramModule = {
  id: number;
  title?: string | null;
  description?: string | null;
  sessionCount?: number | null;
};

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = Number(params?.programId);

  const { data: programsData } = useGetProgramsQuery();
  const { data: modulesData, isLoading, refetch: refetchModules } = useGetProgramModulesQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );

  const [createModule, { isLoading: isCreating }] = useCreateProgramModuleMutation();
  const [updateModule, { isLoading: isUpdating }] = useUpdateProgramModuleMutation();
  const [deleteModule, { isLoading: isDeleting }] = useDeleteProgramModuleMutation();
  const [copyModuleToProgram, { isLoading: isCopying }] = useCopyModuleToProgramMutation();
  const { data: libraryData } = useGetModuleLibraryQuery();

  const [dialog, setDialog] = useState<ModuleDialog>(null);
  const [editModuleId, setEditModuleId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const program = useMemo(
    () => ((programsData?.programs ?? []) as ProgramSummary[]).find((item) => item.id === programId) ?? null,
    [programsData, programId],
  );
  const modules: ProgramModule[] = modulesData?.modules ?? [];

  const isSaving = isCreating || isUpdating || isDeleting || isCopying;
  const libraryModules = libraryData?.modules ?? [];

  const accessLabel = (type?: string) => {
    if (type === "PHP_Pro") return "Elite";
    if (type === "PHP_Premium_Plus") return "Premium Plus";
    if (type === "PHP_Premium") return "Premium";
    return "Program";
  };

  const openCreate = () => {
    setTitle("");
    setDescription("");
    setEditModuleId(null);
    setDialog("create");
  };

  const openEdit = (mod: ProgramModule) => {
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
          programId,
          moduleId: editModuleId,
          patch: { title: title.trim(), description: description.trim() || null },
        }).unwrap();
        await refetchModules();
        toast.success("Module updated");
      } else {
        await createModule({
          programId,
          title: title.trim(),
          description: description.trim() || null,
        }).unwrap();
        await refetchModules();
        toast.success("Module created");
      }
      setDialog(null);
    } catch {
      toast.error(dialog === "edit" ? "Failed to update module" : "Failed to create module");
    }
  };

  const handleDelete = async (moduleId: number) => {
    if (!window.confirm("Delete this module and all its sessions?")) return;
    try {
      await deleteModule({ programId, moduleId }).unwrap();
      await refetchModules();
      toast.success("Module deleted");
    } catch {
      toast.error("Failed to delete module");
    }
  };

  const handleCopyFromLibrary = async (moduleId: number) => {
    try {
      await copyModuleToProgram({ programId, moduleId }).unwrap();
      await refetchModules();
      toast.success("Module copied to program");
      setDialog(null);
    } catch {
      toast.error("Failed to copy module");
    }
  };

  if (isLoading) {
    return (
      <AdminShell title="Program" subtitle="Loading...">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/40" />
          ))}
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={program?.name ?? "Program"}
      subtitle={
        <span className="flex items-center gap-2">
          <Link href="/programs" className="text-muted-foreground hover:text-foreground">
            Programs
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span>{program?.name ?? "Program"}</span>
        </span>
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("library")} disabled={libraryModules.length === 0}>
            <Copy className="mr-1 h-4 w-4" /> From Library
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add Module
          </Button>
        </div>
      }
    >
      {program && (
        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{program.name}</div>
              {program.description && (
                <div className="mt-1 text-xs text-muted-foreground">{program.description}</div>
              )}
            </div>
            <Badge variant="outline">{accessLabel(program.type ?? undefined)}</Badge>
            {(program.minAge || program.maxAge) && (
              <Badge variant="secondary">
                Ages {program.minAge ?? "?"} – {program.maxAge ?? "?"}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <SectionHeader
        title="Modules"
        description={`${modules.length} module${modules.length !== 1 ? "s" : ""} in this program.`}
      />

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="font-semibold text-foreground">No modules yet</p>
          <p className="mt-1">Click &quot;Add Module&quot; to create your first module.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod) => (
            <Link
              key={mod.id}
              href={`/programs/${programId}/modules/${mod.id}`}
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

      <Dialog open={dialog === "create" || dialog === "edit"} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Module" : "Add Module"}</DialogTitle>
            <DialogDescription>
              {dialog === "edit"
                ? "Update this module's title and description."
                : "Create a new module for this program."}
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
                {isSaving ? "Saving..." : dialog === "edit" ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "library"} onOpenChange={() => setDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy from Module Library</DialogTitle>
            <DialogDescription>
              Pick a library module to copy into this program. Sessions and exercises are deep-copied.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {libraryModules.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No modules in library yet. Create some at Programs → Module Library.
              </p>
            ) : (
              libraryModules.map((mod: any) => (
                <button
                  key={mod.id}
                  type="button"
                  disabled={isCopying}
                  onClick={() => handleCopyFromLibrary(mod.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{mod.title}</div>
                    {mod.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{mod.description}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {mod.sessionCount ?? 0} session{(mod.sessionCount ?? 0) !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
