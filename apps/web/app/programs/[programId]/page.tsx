"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
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
import { ChevronRight, Layers, Plus, Settings, Trash2 } from "lucide-react";
import {
  useGetProgramFullQuery,
  useGetProgramModulesQuery,
  useCreateProgramModuleMutation,
  useUpdateProgramModuleMutation,
  useDeleteProgramModuleMutation,
} from "../../../lib/apiSlice";

type ModuleDialog = null | "create" | "edit";

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = Number(params?.programId);

  const { data: fullData, isLoading } = useGetProgramFullQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );
  const { data: modulesData } = useGetProgramModulesQuery(
    { programId },
    { skip: !Number.isFinite(programId) || programId <= 0 },
  );

  const [createModule, { isLoading: isCreating }] = useCreateProgramModuleMutation();
  const [updateModule, { isLoading: isUpdating }] = useUpdateProgramModuleMutation();
  const [deleteModule, { isLoading: isDeleting }] = useDeleteProgramModuleMutation();

  const [dialog, setDialog] = useState<ModuleDialog>(null);
  const [editModuleId, setEditModuleId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const program = fullData?.program ?? null;
  const modules = useMemo(
    () => modulesData?.modules ?? fullData?.program?.modules ?? [],
    [modulesData, fullData],
  );

  const isSaving = isCreating || isUpdating || isDeleting;

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

  const openEdit = (mod: any) => {
    setTitle(mod.title ?? "");
    setDescription(mod.description ?? "");
    setEditModuleId(mod.id);
    setDialog("edit");
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (dialog === "edit" && editModuleId) {
      await updateModule({
        programId,
        moduleId: editModuleId,
        patch: { title: title.trim(), description: description.trim() || null },
      }).unwrap();
    } else {
      await createModule({
        programId,
        title: title.trim(),
        description: description.trim() || null,
      }).unwrap();
    }
    setDialog(null);
  };

  const handleDelete = async (moduleId: number) => {
    if (!window.confirm("Delete this module and all its sessions?")) return;
    await deleteModule({ programId, moduleId }).unwrap();
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
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add Module
        </Button>
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
            <Badge variant="outline">{accessLabel(program.type)}</Badge>
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
          <p className="mt-1">Click "Add Module" to create your first module.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod: any) => (
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

      <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)}>
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
    </AdminShell>
  );
}
