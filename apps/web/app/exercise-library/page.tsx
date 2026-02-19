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
  { value: "nutrition", label: "Nutrition & Food Diaries" },
] as const;

const SESSION_TYPE_LABEL = Object.fromEntries(
  SESSION_TYPES.map((item) => [item.value, item.label])
) as Record<string, string>;

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type FoodDiaryItem = {
  id: number;
  date?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  meals?: Record<string, string> | null;
  athleteName?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  guardianUserId?: number | null;
  athleteId?: number | null;
  feedback?: string | null;
  reviewedAt?: string | null;
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

async function fetchFoodDiaryEntries() {
  const res = await fetch("/api/backend/admin/food-diary", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load food diary entries.");
  }
  const data = await res.json();
  return (data.items ?? []) as FoodDiaryItem[];
}

async function submitFoodDiaryReview(entryId: number, feedback: string | null) {
  const res = await fetch(`/api/backend/admin/food-diary/${entryId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Failed to save feedback.");
  }
  const data = await res.json();
  return data.item as FoodDiaryItem;
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [order, setOrder] = useState("1");
  const [foodDiaryItems, setFoodDiaryItems] = useState<FoodDiaryItem[]>([]);
  const [foodDiaryLoading, setFoodDiaryLoading] = useState(false);
  const [foodDiaryError, setFoodDiaryError] = useState<string | null>(null);
  const [foodDiarySearch, setFoodDiarySearch] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, string>>({});
  const [reviewSavingId, setReviewSavingId] = useState<number | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeSection !== "nutrition") return;
    const loadFoodDiary = async () => {
      setFoodDiaryLoading(true);
      setFoodDiaryError(null);
      try {
        const items = await fetchFoodDiaryEntries();
        setFoodDiaryItems(items);
      } catch (err) {
        setFoodDiaryError(err instanceof Error ? err.message : "Failed to load food diary entries.");
      } finally {
        setFoodDiaryLoading(false);
      }
    };
    void loadFoodDiary();
  }, [activeSection]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
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
    setVideoUrl(item.videoUrl ?? null);
    setOrder(item.order ? String(item.order) : "1");
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

  const filteredFoodDiary = useMemo(() => {
    if (!foodDiarySearch.trim()) return foodDiaryItems;
    const needle = foodDiarySearch.trim().toLowerCase();
    return foodDiaryItems.filter((entry) => {
      const athlete = entry.athleteName ?? "";
      const guardian = entry.guardianName ?? "";
      const email = entry.guardianEmail ?? "";
      return (
        athlete.toLowerCase().includes(needle) ||
        guardian.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle)
      );
    });
  }, [foodDiaryItems, foodDiarySearch]);

  const formatDiaryDate = (value?: string | null) => {
    if (!value) return "Today";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString();
  };

  const formatMeals = (mealData?: Record<string, string> | null) => {
    if (!mealData) return [];
    return Object.entries(mealData)
      .filter(([, value]) => value && value.trim())
      .map(([key, value]) => ({
        label: key.replace(/^\w/, (c) => c.toUpperCase()),
        value,
      }));
  };

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
                Title
              </label>
              <Input
                placeholder="Warmup Focus"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Steps / Notes
              </label>
              <Textarea
                className="min-h-[180px]"
                placeholder="Outline the steps athletes should follow..."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
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

        {activeSection !== "nutrition" ? (
          <Card>
            <CardHeader>
              <SectionHeader
                title={`${SESSION_TYPE_LABEL[activeSection] ?? "Program"} Content`}
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
        ) : null}
      </div>

      {activeSection === "nutrition" ? (
        <Card className="mt-6">
          <CardHeader>
            <SectionHeader
              title="Food Diary Reviews"
              description="Review guardian submissions and respond to athletes."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={foodDiarySearch}
                onChange={(event) => setFoodDiarySearch(event.target.value)}
                placeholder="Search athlete or guardian"
                className="sm:max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Showing {filteredFoodDiary.length} of {foodDiaryItems.length}
              </p>
            </div>

            {foodDiaryLoading ? (
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                Loading food diary entries...
              </div>
            ) : foodDiaryError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {foodDiaryError}
              </div>
            ) : filteredFoodDiary.length === 0 ? (
              <div className="rounded-2xl border border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
                No food diary submissions yet.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFoodDiary.map((entry) => {
                  const meals = formatMeals(entry.meals);
                  const draft = reviewDrafts[entry.id] ?? entry.feedback ?? "";
                  return (
                    <div key={entry.id} className="rounded-3xl border border-border bg-secondary/20 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                            {formatDiaryDate(entry.date)}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {entry.athleteName ?? "Athlete"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Guardian: {entry.guardianName ?? entry.guardianEmail ?? "Unknown"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.feedback ? (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600">
                              Reviewed
                            </span>
                          ) : (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-600">
                              Needs review
                            </span>
                          )}
                          {entry.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPhotoPreviewUrl(entry.photoUrl ?? null)}
                              className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                            >
                              View Photo
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {meals.length ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {meals.map((meal) => (
                            <div key={meal.label} className="rounded-2xl border border-border bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                                {meal.label}
                              </p>
                              <p className="mt-2 text-sm text-foreground">{meal.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {entry.notes ? (
                        <p className="mt-4 text-sm text-foreground">{entry.notes}</p>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Coach Response
                        </label>
                        <Textarea
                          value={draft}
                          onChange={(event) =>
                            setReviewDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))
                          }
                          placeholder="Share feedback or guidance for this entry..."
                          className="min-h-[120px]"
                        />
                        <div className="flex items-center justify-end">
                          <Button
                            onClick={async () => {
                              setReviewSavingId(entry.id);
                              setFoodDiaryError(null);
                              try {
                                const updated = await submitFoodDiaryReview(entry.id, draft.trim() || null);
                                setFoodDiaryItems((prev) =>
                                  prev.map((item) => (item.id === entry.id ? { ...item, ...updated } : item))
                                );
                                setReviewDrafts((prev) => ({ ...prev, [entry.id]: updated.feedback ?? "" }));
                              } catch (err) {
                                setFoodDiaryError(err instanceof Error ? err.message : "Failed to save feedback.");
                              } finally {
                                setReviewSavingId(null);
                              }
                            }}
                            disabled={reviewSavingId === entry.id}
                          >
                            {reviewSavingId === entry.id ? "Saving..." : "Send Response"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
      {photoPreviewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPhotoPreviewUrl(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Food Diary Photo</p>
              <button
                type="button"
                onClick={() => setPhotoPreviewUrl(null)}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
              >
                Close
              </button>
            </div>
            <div className="flex items-center justify-center bg-black/90">
              <img
                src={photoPreviewUrl}
                alt="Food diary submission"
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
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
