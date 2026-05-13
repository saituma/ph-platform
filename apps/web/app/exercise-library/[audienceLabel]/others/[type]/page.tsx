"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";
import { Textarea } from "../../../../../components/ui/textarea";
import {
  AudienceWorkspace,
  isProgramTierAudienceLabel,
  normalizeAudienceLabelInput,
  toStorageAudienceLabel,
  trainingContentRequest,
  clearTrainingContentCache,
} from "../../../../../components/admin/training-content-v2/api";
import { InseasonListPage } from "../inseason-list-page";
import { getOtherSectionConfig } from "../shared";
import { useGetExercisesQuery } from "../../../../../lib/apiSlice";
import { Search, X } from "lucide-react";

export default function OtherContentDetailPage() {
  return (
    <Suspense fallback={null}>
      <OtherContentDetailPageInner />
    </Suspense>
  );
}

function OtherContentDetailPageInner() {
  const params = useParams<{ audienceLabel: string; type: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const fromAdultMode = searchParams.get("mode") === "adult" || isProgramTierAudienceLabel(audienceLabel);
  const storageAudienceLabel = useMemo(
    () => toStorageAudienceLabel({ audienceLabel, adultMode: fromAdultMode }),
    [audienceLabel, fromAdultMode],
  );
  const type = String(params.type ?? "");
  const section = getOtherSectionConfig(type);

  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: exerciseLibraryData } = useGetExercisesQuery();
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  const libraryExercises = exerciseLibraryData?.exercises ?? [];
  const filteredLibrary = librarySearch
    ? libraryExercises.filter((ex: any) =>
        ex.name.toLowerCase().includes(librarySearch.toLowerCase()),
      )
    : libraryExercises.slice(0, 10);

  const pickFromLibrary = (ex: any) => {
    setForm((current) => ({
      ...current,
      title: ex.name ?? current.title,
      body: ex.cues ?? current.body,
      videoUrl: ex.videoUrl ?? current.videoUrl,
    }));
    setLibrarySearch("");
    setLibraryOpen(false);
  };

  const [form, setForm] = useState({
    id: null as number | null,
    title: "",
    body: "",
    scheduleNote: "",
    videoUrl: "",
    order: "",
  });

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(storageAudienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content.");
    }
  };

  useEffect(() => {
    if (!section) {
      router.replace(`/exercise-library/${encodeURIComponent(audienceLabel)}${fromAdultMode ? "?mode=adult" : ""}`);
      return;
    }
    if (section.type === "inseason") return;
    void loadWorkspace();

    const refetch = () => {
      clearTrainingContentCache();
      void loadWorkspace();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [audienceLabel, fromAdultMode, router, section, storageAudienceLabel]);

  if (!section) return null;

  if (section.type === "inseason") {
    return <InseasonListPage audienceLabel={audienceLabel} fromAdultMode={fromAdultMode} />;
  }

  const group = workspace?.others.find((item) => item.type === section.type) ?? null;
  const items = group?.items ?? [];

  const saveItem = async () => {
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        audienceLabel: storageAudienceLabel,
        type: section.type,
        title: form.title.trim(),
        body: form.body.trim(),
        scheduleNote: form.scheduleNote.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        order: form.order.trim() ? Number(form.order) : null,
        metadata: null,
      };

      if (form.id) {
        await trainingContentRequest(`/others/${form.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await trainingContentRequest("/others", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setForm({
        id: null,
        title: "",
        body: "",
        scheduleNote: "",
        videoUrl: "",
        order: "",
      });
      setModalOpen(false);
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!window.confirm("Delete this content item?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(`/others/${itemId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete content.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Exercise library" subtitle={`${fromAdultMode ? "Adult tier" : "Age"} ${audienceLabel} -> ${section.label}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}${fromAdultMode ? "?mode=adult" : ""}`}>
            <Button variant="outline">{fromAdultMode ? "Back to adult tier" : "Back to age"}</Button>
          </Link>
          <Button
            className="ml-auto"
            onClick={() => {
              setForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
              setLibrarySearch("");
              setLibraryOpen(false);
              setModalOpen(true);
            }}
          >
            + Add content
          </Button>
        </div>

        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <Card>
          <CardHeader>
            <SectionHeader
              title={section.label}
              description={section.summary}
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">
                  {item.order}. {item.title}
                </p>
                {item.scheduleNote ? (
                  <p className="mt-1 text-xs font-semibold text-primary">{item.scheduleNote}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                {item.videoUrl ? (
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-primary underline"
                  >
                    Open video
                  </a>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setForm({
                        id: item.id,
                        title: item.title,
                        body: item.body,
                        scheduleNote: item.scheduleNote ?? "",
                        videoUrl: item.videoUrl ?? "",
                        order: String(item.order),
                      });
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteItem(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!items.length ? <p className="text-sm text-muted-foreground">No content created yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) { setLibrarySearch(""); setLibraryOpen(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit content" : `Add ${section.label} content`}</DialogTitle>
            <DialogDescription>
              Add or update admin content for {section.label}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!form.id && (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 pr-9"
                    placeholder="Search exercise library to auto-fill..."
                    value={librarySearch}
                    onFocus={() => setLibraryOpen(true)}
                    onChange={(e) => { setLibrarySearch(e.target.value); setLibraryOpen(true); }}
                  />
                  {librarySearch && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => { setLibrarySearch(""); setLibraryOpen(false); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {libraryOpen && filteredLibrary.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                    {filteredLibrary.map((ex: any) => (
                      <button
                        key={ex.id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-primary/10"
                        onClick={() => pickFromLibrary(ex)}
                      >
                        <span className="flex-1 font-medium text-foreground">{ex.name}</span>
                        {ex.category && (
                          <span className="shrink-0 text-xs text-muted-foreground">{ex.category}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {libraryOpen && librarySearch && filteredLibrary.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No exercises match "{librarySearch}"</p>
                )}
              </div>
            )}
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            <Textarea
              placeholder="Content"
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            />
            <Input
              placeholder="Schedule note (optional)"
              value={form.scheduleNote}
              onChange={(event) => setForm((current) => ({ ...current, scheduleNote: event.target.value }))}
            />
            <Input
              placeholder="Video URL (optional)"
              value={form.videoUrl}
              onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
            />
            <Input
              placeholder="Order (optional)"
              value={form.order}
              onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveItem} disabled={isSaving || !form.title.trim()}>
                {isSaving ? "Saving..." : form.id ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
