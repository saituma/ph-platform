"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Badge } from "../../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { useCreateContentMutation, useGetParentContentQuery, useUpdateContentMutation } from "../../../lib/apiSlice";
import { ParentCourseMediaUpload } from "./parent-course-media-upload";

const CATEGORIES = [
  "Growth and maturation",
  "Injury prevention",
  "Sleep and recovery",
  "Nutrition for young athletes",
  "Training load management",
  "Mindset and confidence",
];

const CONTENT_TYPES = ["article", "video", "pdf", "faq"] as const;
type ContentType = (typeof CONTENT_TYPES)[number];
type ParentContentItem = {
  id: number;
  title?: string | null;
  content?: string | null;
  body?: string | null;
  category?: string | null;
  type?: ContentType | null;
  programTier?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  ageList?: number[] | null;
};

type ApiErrorLike = {
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}
const TIER_OPTIONS = [
  { value: "", label: "All tiers" },
  { value: "PHP", label: "PHP Program" },
  { value: "PHP_Premium", label: "PHP Premium" },
  { value: "PHP_Premium_Plus", label: "PHP Premium Plus" },
  { value: "PHP_Pro", label: "PHP Pro" },
];

const CONTENT_TYPE_ITEMS = CONTENT_TYPES.map((t) => ({ label: t.toUpperCase(), value: t }));

const CATEGORY_ITEMS = CATEGORIES.map((cat) => ({ label: cat, value: cat }));

const AGE_MODE_ITEMS = [
  { label: "Min / Max range", value: "range" },
  { label: "Exact ages", value: "exact" },
];

export function ParentContentCard() {
  const { data, refetch, isLoading } = useGetParentContentQuery();
  const [createContent, { isLoading: isSaving }] = useCreateContentMutation();
  const [updateContent, { isLoading: isUpdating }] = useUpdateContentMutation();
  const [ageMode, setAgeMode] = useState<"range" | "exact">("range");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [type, setType] = useState<(typeof CONTENT_TYPES)[number]>("article");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [tier, setTier] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [ageList, setAgeList] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ParentContentItem | null>(null);

  const formatAgeRange = (item: { minAge?: number | null; maxAge?: number | null; ageList?: number[] | null }) => {
    if (Array.isArray(item.ageList) && item.ageList.length) {
      return `Ages ${item.ageList.join(", ")}`;
    }
    if (item.minAge == null && item.maxAge == null) return "All ages";
    if (item.minAge != null && item.maxAge != null) return `Ages ${item.minAge}-${item.maxAge}`;
    if (item.minAge != null) return `Ages ${item.minAge}+`;
    return `Up to ${item.maxAge}`;
  };

  const parseAgeList = (value: string) => {
    const entries = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => Number(entry));
    if (!entries.length) return [] as number[];
    return entries.filter((age) => Number.isFinite(age) && age >= 0);
  };

  const grouped = useMemo(() => {
    const items: ParentContentItem[] = Array.isArray(data?.items) ? data.items : [];
    return CATEGORIES.map((cat) => ({
      category: cat,
      items: items.filter((item) => item.category === cat),
    }));
  }, [data]);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setBody("");
    setTier("");
    setMinAge("");
    setMaxAge("");
    setAgeList("");
    setAgeMode("range");
    setType("article");
    setCategory(CATEGORIES[0]);
    setEditingItem(null);
  };

  const handleCreate = async (keepOpen = false) => {
    setError(null);
    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }
    const ageListValues = ageMode === "exact" ? parseAgeList(ageList) : [];
    const minAgeValue = minAge.trim() ? Number(minAge) : null;
    const maxAgeValue = maxAge.trim() ? Number(maxAge) : null;
    if (ageMode === "exact" && ageList.trim() && ageListValues.length === 0) {
      setError("Please enter valid ages (e.g. 5, 6, 7).");
      return;
    }
    if (ageMode === "range" && ((minAgeValue !== null && Number.isNaN(minAgeValue)) || (maxAgeValue !== null && Number.isNaN(maxAgeValue)))) {
      setError("Age limits must be valid numbers.");
      return;
    }
    if (ageMode === "range" && minAgeValue !== null && maxAgeValue !== null && minAgeValue > maxAgeValue) {
      setError("Minimum age cannot be greater than maximum age.");
      return;
    }
    try {
      await createContent({
        title: title.trim(),
        content: summary.trim(),
        type,
        body: body.trim() || undefined,
        programTier: tier || undefined,
        ageList: ageMode === "exact" ? ageListValues : undefined,
        minAge: ageMode === "range" ? minAgeValue ?? undefined : undefined,
        maxAge: ageMode === "range" ? maxAgeValue ?? undefined : undefined,
        surface: "parent_platform",
        category,
      }).unwrap();
      resetForm();
      if (!keepOpen) {
        setModalOpen(false);
      }
      refetch();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to publish content."));
    }
  };

  const handleEdit = (item: ParentContentItem) => {
    setEditingItem(item);
    setTitle(item.title ?? "");
    setSummary(item.content ?? "");
    setBody(item.body ?? "");
    setType(item.type ?? "article");
    setTier(item.programTier ?? "");
    setMinAge(item.minAge != null ? String(item.minAge) : "");
    setMaxAge(item.maxAge != null ? String(item.maxAge) : "");
    if (Array.isArray(item.ageList) && item.ageList.length) {
      setAgeMode("exact");
      setAgeList(item.ageList.join(", "));
      setMinAge("");
      setMaxAge("");
    } else {
      setAgeMode("range");
      setAgeList("");
    }
    setCategory(item.category ?? CATEGORIES[0]);
    setError(null);
    setModalOpen(true);
  };

  const handleNewForCategory = (cat: string) => {
    resetForm();
    setCategory(cat);
    setModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setError(null);
    if (!title.trim() || !summary.trim()) {
      setError("Title and summary are required.");
      return;
    }
    const ageListValues = ageMode === "exact" ? parseAgeList(ageList) : [];
    const minAgeValue = minAge.trim() ? Number(minAge) : null;
    const maxAgeValue = maxAge.trim() ? Number(maxAge) : null;
    if (ageMode === "exact" && ageList.trim() && ageListValues.length === 0) {
      setError("Please enter valid ages (e.g. 5, 6, 7).");
      return;
    }
    if (ageMode === "range" && ((minAgeValue !== null && Number.isNaN(minAgeValue)) || (maxAgeValue !== null && Number.isNaN(maxAgeValue)))) {
      setError("Age limits must be valid numbers.");
      return;
    }
    if (ageMode === "range" && minAgeValue !== null && maxAgeValue !== null && minAgeValue > maxAgeValue) {
      setError("Minimum age cannot be greater than maximum age.");
      return;
    }
    try {
      await updateContent({
        id: editingItem.id,
        data: {
          title: title.trim(),
          content: summary.trim(),
          type,
          body: body.trim() || undefined,
          programTier: tier || undefined,
          category,
          ageList: ageMode === "exact" ? ageListValues : undefined,
          minAge: ageMode === "range" ? minAgeValue ?? undefined : undefined,
          maxAge: ageMode === "range" ? maxAgeValue ?? undefined : undefined,
        },
      }).unwrap();
      resetForm();
      setModalOpen(false);
      refetch();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update content."));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Athlete Education Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Create and edit athlete education content.</p>
          <Button onClick={() => { resetForm(); setModalOpen(true); }}>New Content</Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            grouped
              .filter((group) => group.items.length > 0)
              .map((group) => (
              <div key={group.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{group.category}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.items.length}</Badge>
                    <Button size="sm" variant="outline" onClick={() => handleNewForCategory(group.category)}>
                      Add
                    </Button>
                  </div>
                </div>
                {group.items.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border p-3 text-left hover:border-primary/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type?.toUpperCase()} • {item.programTier ?? "All tiers"} • {formatAgeRange(item)}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                            Edit
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Content" : "New Content"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update parent education content." : "Publish a new parent education item."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" />
              </div>
              <div className="space-y-2">
                <Label>Summary</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short description" />
              </div>
              <div className="space-y-2">
                <Label>Details / Media URL</Label>
                {type === "video" ? (
                  <div className="space-y-2">
                    <ParentCourseMediaUpload
                      label={body ? "Replace Video" : "Upload Video"}
                      folder="parent-content/video"
                      accept="video/*"
                      maxSizeMb={200}
                      onUploaded={(url) => setBody(url)}
                    />
                    {body ? (
                      <video
                        className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                        src={body}
                        controls
                        muted
                      />
                    ) : null}
                  </div>
                ) : null}
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    type === "video" || type === "pdf"
                      ? "Paste video or PDF URL"
                      : "Full content or outline"
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select items={CATEGORY_ITEMS} value={category} onValueChange={(v) => setCategory(v ?? CATEGORIES[0])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {CATEGORY_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select items={CONTENT_TYPE_ITEMS} value={type} onValueChange={(v) => setType((v ?? "article") as ContentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {CONTENT_TYPE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Age Targeting</Label>
                  <Select items={AGE_MODE_ITEMS} value={ageMode} onValueChange={(v) => setAgeMode((v ?? "range") as "range" | "exact")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {AGE_MODE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </div>
              {ageMode === "exact" ? (
                <div className="space-y-2">
                  <Label>Ages (comma-separated)</Label>
                  <Input
                    value={ageList}
                    onChange={(e) => setAgeList(e.target.value)}
                    placeholder="e.g. 5, 6, 7"
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Age</Label>
                  <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} placeholder="e.g. 10" />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Age</Label>
                  <Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} placeholder="e.g. 14" />
                </div>
              </div>
              )}
              <div className="space-y-2">
                <Label>Access Tier</Label>
                <Select items={TIER_OPTIONS} value={tier} onValueChange={(v) => setTier(v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    {TIER_OPTIONS.map((item) => (
                      <SelectItem key={item.value || "all"} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
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
                  <>
                    <Button variant="outline" onClick={() => handleCreate(true)} disabled={isSaving}>
                      {isSaving ? "Publishing..." : "Publish & Add Another"}
                    </Button>
                    <Button onClick={() => handleCreate(false)} disabled={isSaving}>
                      {isSaving ? "Publishing..." : "Publish"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
