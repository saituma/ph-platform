"use client";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { cn } from "../../../lib/utils";
import { ParentCourseModule, ModuleType, PARENT_MODULE_TYPES, createModuleId, normalizeModules } from "./parent-course-types";
import { ParentCourseMediaUpload } from "./parent-course-media-upload";

type ParentCourseModulesEditorProps = {
  modules: ParentCourseModule[];
  onModulesChange: (modules: ParentCourseModule[]) => void;
  newModuleType: ModuleType;
  onNewModuleTypeChange: (value: ModuleType) => void;
};

export function ParentCourseModulesEditor({
  modules,
  onModulesChange,
  newModuleType,
  onNewModuleTypeChange,
}: ParentCourseModulesEditorProps) {
  const addModule = () => {
    const next = normalizeModules([
      ...modules,
      {
        id: createModuleId(),
        title: "New module",
        type: newModuleType,
        content: "",
        mediaUrl: "",
        order: modules.length,
        preview: false,
      },
    ]);
    onModulesChange(next);
  };

  const updateModule = (id: string, update: Partial<ParentCourseModule>) => {
    onModulesChange(normalizeModules(modules.map((module) => (module.id === id ? { ...module, ...update } : module))));
  };

  const removeModule = (id: string) => {
    onModulesChange(normalizeModules(modules.filter((module) => module.id !== id)));
  };

  const moveModule = (index: number, direction: -1 | 1) => {
    const next = [...modules];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onModulesChange(normalizeModules(next.map((module, idx) => ({ ...module, order: idx }))));
  };

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Modules</p>
          <p className="text-xs text-muted-foreground">Order modules and flag preview items for PHP.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={newModuleType} onChange={(e) => onNewModuleTypeChange(e.target.value as ModuleType)}>
            {PARENT_MODULE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase()}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" onClick={addModule}>
            Add Module
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {modules.length ? (
          modules.map((module, index) => (
            <div
              key={module.id}
              className={cn(
                "rounded-2xl border border-border p-4",
                module.preview ? "bg-amber-50/60" : "bg-muted/40"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Module {index + 1}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveModule(index, -1)}
                    disabled={index === 0}
                  >
                    Up
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveModule(index, 1)}
                    disabled={index === modules.length - 1}
                  >
                    Down
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeModule(module.id)}>
                    Remove
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={module.title}
                    onChange={(e) => updateModule(module.id, { title: e.target.value })}
                    placeholder="Module title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={module.type}
                    onChange={(e) => updateModule(module.id, { type: e.target.value as ModuleType })}
                  >
                    {PARENT_MODULE_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value.toUpperCase()}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Module Content</Label>
                  <Textarea
                    value={module.content ?? ""}
                    onChange={(e) => updateModule(module.id, { content: e.target.value })}
                    placeholder={module.type === "faq" ? "Answer text" : "Module content or outline"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Media URL</Label>
                  <Input
                    value={module.mediaUrl ?? ""}
                    onChange={(e) => updateModule(module.id, { mediaUrl: e.target.value })}
                    placeholder="Video or PDF URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports YouTube links or direct MP4/PDF URLs.
                  </p>
                  <ParentCourseMediaUpload
                    label="Upload Media"
                    folder="parent-courses/media"
                    accept="video/*,application/pdf"
                    maxSizeMb={200}
                    onUploaded={(url) => updateModule(module.id, { mediaUrl: url })}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-border"
                      checked={Boolean(module.preview)}
                      onChange={(e) => updateModule(module.id, { preview: e.target.checked })}
                    />
                    Preview for PHP (lower tiers)
                  </label>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No modules yet. Add your first module.</p>
        )}
      </div>
    </div>
  );
}
