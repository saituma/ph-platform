"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import {
  useCreateAgeExperienceRuleMutation,
  useDeleteAgeExperienceRuleMutation,
  useGetAgeExperienceRulesQuery,
  useUpdateAgeExperienceRuleMutation,
} from "../../../lib/apiSlice";

const UI_PRESETS = [
  { value: "playful", label: "Playful" },
  { value: "standard", label: "Standard" },
  { value: "performance", label: "Performance" },
];

const FONT_SIZES = [
  { value: "small", label: "Small" },
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "extraLarge", label: "Extra Large" },
];

const DENSITIES = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "spacious", label: "Spacious" },
];

const SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "schedule", label: "Schedule" },
  { id: "messages", label: "Messages" },
  { id: "programs", label: "Programs" },
  { id: "videoFeedback", label: "Video Feedback" },
  { id: "foodDiary", label: "Food Diary" },
  { id: "physioReferrals", label: "Referrals" },
  { id: "exerciseLibrary", label: "Exercise Library" },
  { id: "parentPlatform", label: "Parent Platform" },
  { id: "settings", label: "Settings" },
];

type RuleItem = {
  id: number;
  title: string;
  minAge?: number | null;
  maxAge?: number | null;
  isDefault?: boolean | null;
  uiPreset?: string | null;
  fontSizeOption?: string | null;
  density?: string | null;
  hiddenSections?: string[] | null;
};

const formatAgeRange = (rule: { minAge?: number | null; maxAge?: number | null }) => {
  if (rule.minAge == null && rule.maxAge == null) return "All ages";
  if (rule.minAge != null && rule.maxAge != null) return `Ages ${rule.minAge}-${rule.maxAge}`;
  if (rule.minAge != null) return `Ages ${rule.minAge}+`;
  return `Up to ${rule.maxAge}`;
};

export function AgeExperienceCard() {
  const { data, refetch, isLoading } = useGetAgeExperienceRulesQuery();
  const [createRule, { isLoading: isSaving }] = useCreateAgeExperienceRuleMutation();
  const [updateRule, { isLoading: isUpdating }] = useUpdateAgeExperienceRuleMutation();
  const [deleteRule, { isLoading: isDeleting }] = useDeleteAgeExperienceRuleMutation();

  const [title, setTitle] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [isDefault, setIsDefault] = useState("false");
  const [uiPreset, setUiPreset] = useState("standard");
  const [fontSizeOption, setFontSizeOption] = useState("default");
  const [density, setDensity] = useState("default");
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RuleItem | null>(null);

  const rules = useMemo(() => data?.items ?? [], [data]);

  const resetForm = () => {
    setTitle("");
    setMinAge("");
    setMaxAge("");
    setIsDefault("false");
    setUiPreset("standard");
    setFontSizeOption("default");
    setDensity("default");
    setHiddenSections([]);
    setEditingItem(null);
  };

  const normalizeAgeValue = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const validate = () => {
    if (!title.trim()) {
      setError("Title is required.");
      return false;
    }
    const minAgeValue = normalizeAgeValue(minAge);
    const maxAgeValue = normalizeAgeValue(maxAge);
    if (minAgeValue === null && minAge.trim()) {
      setError("Minimum age must be a number.");
      return false;
    }
    if (maxAgeValue === null && maxAge.trim()) {
      setError("Maximum age must be a number.");
      return false;
    }
    if (minAgeValue !== null && maxAgeValue !== null && minAgeValue > maxAgeValue) {
      setError("Minimum age cannot be greater than maximum age.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    const minAgeValue = normalizeAgeValue(minAge);
    const maxAgeValue = normalizeAgeValue(maxAge);
    try {
      await createRule({
        title: title.trim(),
        minAge: minAgeValue ?? undefined,
        maxAge: maxAgeValue ?? undefined,
        isDefault: isDefault === "true",
        uiPreset,
        fontSizeOption,
        density,
        hiddenSections: hiddenSections.length ? hiddenSections : undefined,
      }).unwrap();
      resetForm();
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create rule.");
    }
  };

  const handleEdit = (item: RuleItem) => {
    setEditingItem(item);
    setTitle(item.title ?? "");
    setMinAge(item.minAge != null ? String(item.minAge) : "");
    setMaxAge(item.maxAge != null ? String(item.maxAge) : "");
    setIsDefault(item.isDefault ? "true" : "false");
    setUiPreset(item.uiPreset ?? "standard");
    setFontSizeOption(item.fontSizeOption ?? "default");
    setDensity(item.density ?? "default");
    setHiddenSections(Array.isArray(item.hiddenSections) ? item.hiddenSections : []);
    setError(null);
    setModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem || !validate()) return;
    const minAgeValue = normalizeAgeValue(minAge);
    const maxAgeValue = normalizeAgeValue(maxAge);
    try {
      await updateRule({
        id: editingItem.id,
        data: {
          title: title.trim(),
          minAge: minAgeValue ?? undefined,
          maxAge: maxAgeValue ?? undefined,
          isDefault: isDefault === "true",
          uiPreset,
          fontSizeOption,
          density,
          hiddenSections: hiddenSections.length ? hiddenSections : [],
        },
      }).unwrap();
      resetForm();
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update rule.");
    }
  };

  const handleDelete = async (item: RuleItem) => {
    if (!confirm(`Delete rule "${item.title}"?`)) return;
    try {
      await deleteRule({ id: item.id }).unwrap();
      refetch();
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete rule.");
    }
  };

  const toggleHiddenSection = (sectionId: string) => {
    setHiddenSections((prev) => {
      if (prev.includes(sectionId)) {
        return prev.filter((item) => item !== sectionId);
      }
      return [...prev, sectionId];
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Age Experience Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Define UI density, font scale, and content visibility for each age or range. The rule{" "}
            <span className="font-medium text-foreground">title</span> is what athletes see on the mobile{" "}
            <span className="font-medium text-foreground">More</span> tab under{" "}
            <span className="font-medium text-foreground">Experience</span>.
          </p>
          <Button onClick={() => { resetForm(); setModalOpen(true); }}>New Rule</Button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading rules...</p>
          ) : rules.length ? (
            rules.map((rule: RuleItem) => (
              <div key={rule.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                      {rule.isDefault ? <Badge variant="outline">Default</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatAgeRange(rule)} • {rule.uiPreset ?? "standard"} • {rule.fontSizeOption ?? "default"} • {rule.density ?? "default"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hidden sections: {Array.isArray(rule.hiddenSections) && rule.hiddenSections.length ? rule.hiddenSections.length : 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(rule)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(rule)} disabled={isDeleting}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No rules yet.</p>
          )}
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Rule" : "New Rule"}</DialogTitle>
              <DialogDescription>
                Configure how the mobile app looks and what content appears for specific ages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Age 5 focus" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Age</Label>
                  <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Age</Label>
                  <Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="e.g. 7" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Rule</Label>
                <Select value={isDefault} onChange={(e) => setIsDefault(e.target.value)}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>UI Preset</Label>
                  <Select value={uiPreset} onChange={(e) => setUiPreset(e.target.value)}>
                    {UI_PRESETS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select value={fontSizeOption} onChange={(e) => setFontSizeOption(e.target.value)}>
                    {FONT_SIZES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Density</Label>
                <Select value={density} onChange={(e) => setDensity(e.target.value)}>
                  {DENSITIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hidden Sections</Label>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map((section) => {
                    const isHidden = hiddenSections.includes(section.id);
                    return (
                      <Button
                        key={section.id}
                        type="button"
                        size="sm"
                        variant={isHidden ? "default" : "outline"}
                        onClick={() => toggleHiddenSection(section.id)}
                      >
                        {section.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                {editingItem ? (
                  <Button onClick={handleUpdate} disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                ) : (
                  <Button onClick={handleCreate} disabled={isSaving}>
                    {isSaving ? "Creating..." : "Create Rule"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
