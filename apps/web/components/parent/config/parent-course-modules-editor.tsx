"use client";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { cn } from "../../../lib/utils";
import { ParentCourseModule, ModuleType, PARENT_MODULE_TYPES, createModuleId, normalizeModules } from "./parent-course-types";
import { ParentCourseMediaUpload } from "./parent-course-media-upload";

const MODULE_TYPE_ITEMS = PARENT_MODULE_TYPES.map((t) => ({ label: t.toUpperCase(), value: t }));

type ParentCourseModulesEditorProps = {
  modules: ParentCourseModule[];
  onModulesChange: (modules: ParentCourseModule[]) => void;
  newModuleType: ModuleType;
  onNewModuleTypeChange: (value: ModuleType) => void;
  onError?: (msg: string | null) => void;
};

export function ParentCourseModulesEditor({
  modules,
  onModulesChange,
  newModuleType,
  onNewModuleTypeChange,
  onError,
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
          <Select items={MODULE_TYPE_ITEMS} value={newModuleType} onValueChange={(v) => onNewModuleTypeChange((v ?? "article") as ModuleType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectPopup>
              {MODULE_TYPE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectPopup>
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
                    items={MODULE_TYPE_ITEMS}
                    value={module.type}
                    onValueChange={(v) => updateModule(module.id, { type: (v ?? "article") as ModuleType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {MODULE_TYPE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith("data:")) {
                        onError?.("Module " + (index + 1) + ": Use an upload or a hosted URL instead of pasting base64 data.");
                      } else {
                        onError?.(null);
                      }
                      updateModule(module.id, { mediaUrl: val });
                    }}
                    placeholder="Video, PDF, or Image URL"
                    className={module.mediaUrl?.startsWith("data:") ? "border-destructive text-destructive" : ""}
                  />
                  {module.mediaUrl?.startsWith("data:") ? (
                    <p className="font-medium text-destructive">
                      Base64 detected! Please delete this and upload a file instead.
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Supports YouTube links, images, or direct MP4/PDF URLs.
                  </p>
                  <ParentCourseMediaUpload
                    label="Upload Media"
                    folder="parent-courses/media"
                    accept="video/*,application/pdf,image/*"
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
