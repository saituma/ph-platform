"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { ParentCourseMediaUpload } from "../../components/parent/config/parent-course-media-upload";

const PROGRAM_SECTION_API_BASE = "/api/backend/program-section-content";

const SESSION_TYPES = [
  { value: "program", label: "Session Program" },
  { value: "warmup", label: "Warmups" },
  { value: "cooldown", label: "Cool Downs" },
  { value: "stretching", label: "Stretching & Foam Rolling" },
  { value: "mobility", label: "Mobility" },
  { value: "recovery", label: "Recovery" },
  { value: "offseason", label: "Off Session Program" },
  { value: "inseason", label: "In Session Program" },
  { value: "nutrition", label: "Athlete Platform" },
] as const;

const SESSION_TYPE_LABEL = Object.fromEntries(
  SESSION_TYPES.map((item) => [item.value, item.label])
) as Record<string, string>;

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  ageList?: number[] | null;
  videoUrl?: string | null;
  order?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

async function fetchProgramSectionContent(sectionType: string) {
  const res = await fetch(
    `${PROGRAM_SECTION_API_BASE}?sectionType=${encodeURIComponent(sectionType)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    throw new Error("Failed to load program section content.");
  }
  const data = await res.json();
  return (data.items ?? []) as ProgramSectionContent[];
}

async function createProgramSectionContent(payload: {
  sectionType: string;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
}) {
  const res = await fetch(PROGRAM_SECTION_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create section content.");
  }
  const data = await res.json();
  return data.item as ProgramSectionContent;
}

async function updateProgramSectionContent(id: number, payload: {
  sectionType: string;
  ageList?: number[] | null;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
}) {
  const res = await fetch(`${PROGRAM_SECTION_API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to update section content.");
  }
  const data = await res.json();
  return data.item as ProgramSectionContent;
}

async function deleteProgramSectionContent(id: number) {
  const res = await fetch(`${PROGRAM_SECTION_API_BASE}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to delete section content.");
  }
}

function ExerciseLibraryPageInner() {
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>("program");
  const [items, setItems] = useState<ProgramSectionContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [ageList, setAgeList] = useState<number[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [order, setOrder] = useState("1");

  const loadItems = async (sectionType = activeSection) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProgramSectionContent(sectionType);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load section content.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && SESSION_TYPES.some((item) => item.value === tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadItems(activeSection);
  }, [activeSection]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setAgeInput("");
    setAgeList([]);
    setVideoUrl(null);
    setOrder("1");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        sectionType: activeSection,
        title: title.trim(),
        body: body.trim(),
        ageList: ageList.length ? ageList : null,
        videoUrl: videoUrl || null,
        order: order.trim() ? Number(order) : null,
      };

      if (editingId) {
        const updated = await updateProgramSectionContent(editingId, payload);
        setItems((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createProgramSectionContent(payload);
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save section content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: ProgramSectionContent) => {
    setEditingId(item.id);
    setTitle(item.title ?? "");
    setBody(item.body ?? "");
    setAgeInput("");
    setAgeList(Array.isArray(item.ageList) ? item.ageList : []);
    setVideoUrl(item.videoUrl ?? null);
    setOrder(item.order ? String(item.order) : "1");
  };

  const handleAddAge = () => {
    const parsed = Number(ageInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const normalized = Math.floor(parsed);
    setAgeList((prev) => {
      if (prev.includes(normalized)) return prev;
      return [...prev, normalized].sort((a, b) => a - b);
    });
    setAgeInput("");
  };

  const handleRemoveAge = (age: number) => {
    setAgeList((prev) => prev.filter((item) => item !== age));
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Delete this content entry?");
    if (!confirmed) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteProgramSectionContent(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete section content.");
    } finally {
      setIsSaving(false);
    }
  };

  const orderedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
      const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });
  }, [items]);

  return (
    <AdminShell title="Exercise Library" subtitle="Centralized exercise and video management.">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Program Section
          </p>
          <Tabs value={activeSection} onValueChange={setActiveSection}>
            <TabsList className="flex w-full flex-wrap gap-2">
              {SESSION_TYPES.map((sessionType) => (
                <TabsTrigger
                  key={sessionType.value}
                  value={sessionType.value}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  {sessionType.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <SectionHeader
              title={`${SESSION_TYPE_LABEL[activeSection] ?? "Program"} Upload`}
              description="Create section-specific guidance for athletes."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Course / Module Title
              </label>
              <Input
                placeholder="Course title or module name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Module Notes
              </label>
              <Textarea
                className="min-h-[180px]"
                placeholder="Outline the module steps or coaching notes..."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ages
              </label>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Add age"
                  value={ageInput}
                  onChange={(event) => setAgeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddAge();
                    }
                  }}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAge}
                  disabled={!ageInput.trim()}
                >
                  Add Age
                </Button>
              </div>
              {ageList.length ? (
                <div className="flex flex-wrap gap-2">
                  {ageList.map((age) => (
                    <div
                      key={age}
                      className="flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs"
                    >
                      <span>Age {age}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAge(age)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove age ${age}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No ages set. Content will show for all ages.
                </p>
              )}
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Optional Video
                </p>
                <ParentCourseMediaUpload
                  label={videoUrl ? "Replace Video" : "Upload Video"}
                  folder="program-section"
                  accept="video/*"
                  maxSizeMb={200}
                  onUploaded={(url) => setVideoUrl(url)}
                />
              </div>
              {videoUrl ? (
                <video
                  className="aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                  src={videoUrl}
                  controls
                  muted
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground">
                  Upload a video file for this section.
                </div>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order
                </label>
                <Input
                  type="number"
                  min={1}
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                {editingId ? (
                  <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                    Cancel Edit
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isSaving || !title.trim() || !body.trim()}
                >
                  {isSaving ? "Saving..." : editingId ? "Update Content" : "Publish Content"}
                </Button>
              </div>
            </div>
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title={`${SESSION_TYPE_LABEL[activeSection] ?? "Program"} Content`}
              description="Publish age-specific courses and modules for athletes."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                Loading content...
              </div>
            ) : null}
            {orderedItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Order {item.order ?? 1}</p>
                    {Array.isArray(item.ageList) && item.ageList.length ? (
                      <p className="text-xs text-muted-foreground">
                        Ages: {item.ageList.join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Ages: All</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleEdit(item)} disabled={isSaving}>
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => void handleDelete(item.id)} disabled={isSaving}>
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                  {item.body}
                </p>
                {item.videoUrl ? (
                  <video
                    className="mt-3 aspect-video w-full rounded-2xl border border-border bg-secondary/40 object-cover"
                    src={item.videoUrl}
                    controls
                    muted
                  />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

export default function ExerciseLibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <ExerciseLibraryPageInner />
    </Suspense>
  );
}
