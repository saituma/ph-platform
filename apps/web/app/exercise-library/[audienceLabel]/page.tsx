"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../components/admin/shell";
import { SectionHeader } from "../../../components/admin/section-header";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  AudienceWorkspace,
  OTHER_TYPES,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../components/admin/training-content-v2/api";

export default function AudienceDetailPage() {
  const params = useParams<{ audienceLabel: string }>();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState<"age" | "others">("age");
  const [selectedOtherType, setSelectedOtherType] = useState("mobility");
  const [moduleForm, setModuleForm] = useState({ id: null as number | null, title: "", order: "" });
  const [otherForm, setOtherForm] = useState({ id: null as number | null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
      if (!data.others.find((item) => item.type === selectedOtherType)) {
        setSelectedOtherType(data.others[0]?.type ?? "mobility");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audience.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const selectedOtherGroup = workspace?.others.find((group) => group.type === selectedOtherType) ?? workspace?.others[0] ?? null;

  const saveModule = async () => {
    if (!moduleForm.title.trim()) return;
    setIsSaving(true);
    try {
      if (moduleForm.id) {
        await trainingContentRequest(`/modules/${moduleForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: moduleForm.title,
            order: moduleForm.order.trim() ? Number(moduleForm.order) : null,
          }),
        });
      } else {
        await trainingContentRequest("/modules", {
          method: "POST",
          body: JSON.stringify({
            audienceLabel,
            title: moduleForm.title,
            order: moduleForm.order.trim() ? Number(moduleForm.order) : null,
          }),
        });
      }
      setModuleForm({ id: null, title: "", order: "" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveOther = async () => {
    if (!otherForm.title.trim() || !otherForm.body.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        audienceLabel,
        type: selectedOtherType,
        title: otherForm.title,
        body: otherForm.body,
        scheduleNote: otherForm.scheduleNote.trim() || null,
        videoUrl: otherForm.videoUrl.trim() || null,
        order: otherForm.order.trim() ? Number(otherForm.order) : null,
        metadata: null,
      };
      if (otherForm.id) {
        await trainingContentRequest(`/others/${otherForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await trainingContentRequest("/others", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save content.");
    } finally {
      setIsSaving(false);
    }
  };

  const deletePath = async (path: string) => {
    if (!window.confirm("Delete this item?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(path, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Audience: ${audienceLabel}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/exercise-library">
            <Button variant="outline">Back to audiences</Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant={activeTab === "age" ? "default" : "outline"} onClick={() => setActiveTab("age")}>
              Age
            </Button>
            <Button variant={activeTab === "others" ? "default" : "outline"} onClick={() => setActiveTab("others")}>
              Others
            </Button>
          </div>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {activeTab === "age" ? (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card>
              <CardHeader>
                <SectionHeader title={`${audienceLabel} modules`} description="Click a module to open its session list page." />
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Module name"
                  value={moduleForm.title}
                  onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Order"
                    value={moduleForm.order}
                    onChange={(event) => setModuleForm((current) => ({ ...current, order: event.target.value }))}
                  />
                  <Button onClick={saveModule} disabled={isSaving}>
                    {moduleForm.id ? "Update" : "Add module"}
                  </Button>
                </div>
                {moduleForm.id ? (
                  <Button variant="ghost" onClick={() => setModuleForm({ id: null, title: "", order: "" })}>
                    Cancel edit
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title="Module list" description="Next step after this page is the module session page." />
              </CardHeader>
              <CardContent className="space-y-3">
                {workspace?.modules.map((module) => (
                  <div key={module.id} className="rounded-2xl border border-border p-4">
                    <p className="text-lg font-semibold text-foreground">{module.order}. {module.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {module.sessions.length} sessions · {module.totalDayLength} total days
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${module.id}`}>
                        <Button size="sm">Open module</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setModuleForm({ id: module.id, title: module.title, order: String(module.order) })}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deletePath(`/modules/${module.id}`)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {!workspace?.modules.length ? <p className="text-sm text-muted-foreground">No modules created yet.</p> : null}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card>
              <CardHeader>
                <SectionHeader title="Others" description="Standalone content outside the module flow." />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {OTHER_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={selectedOtherType === type.value ? "default" : "outline"}
                      onClick={() => {
                        setSelectedOtherType(type.value);
                        setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" });
                      }}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
                <Input placeholder="Title" value={otherForm.title} onChange={(event) => setOtherForm((current) => ({ ...current, title: event.target.value }))} />
                <Textarea placeholder="Content body" value={otherForm.body} onChange={(event) => setOtherForm((current) => ({ ...current, body: event.target.value }))} />
                <Input placeholder="Schedule note" value={otherForm.scheduleNote} onChange={(event) => setOtherForm((current) => ({ ...current, scheduleNote: event.target.value }))} />
                <div className="flex gap-2">
                  <Input placeholder="Video URL" value={otherForm.videoUrl} onChange={(event) => setOtherForm((current) => ({ ...current, videoUrl: event.target.value }))} />
                  <Input placeholder="Order" value={otherForm.order} onChange={(event) => setOtherForm((current) => ({ ...current, order: event.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveOther} disabled={isSaving}>
                    {otherForm.id ? "Update" : "Add content"}
                  </Button>
                  {otherForm.id ? (
                    <Button variant="ghost" onClick={() => setOtherForm({ id: null, title: "", body: "", scheduleNote: "", videoUrl: "", order: "" })}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeader title={selectedOtherGroup?.label ?? "Other items"} description="These become separate mobile tabs when content exists." />
              </CardHeader>
              <CardContent className="space-y-3">
                {(selectedOtherGroup?.items ?? []).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border p-4">
                    <p className="text-lg font-semibold text-foreground">{item.order}. {item.title}</p>
                    {item.scheduleNote ? <p className="mt-1 text-xs font-semibold text-primary">{item.scheduleNote}</p> : null}
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOtherForm({
                            id: item.id,
                            title: item.title,
                            body: item.body,
                            scheduleNote: item.scheduleNote ?? "",
                            videoUrl: item.videoUrl ?? "",
                            order: String(item.order),
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deletePath(`/others/${item.id}`)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {!selectedOtherGroup?.items.length ? <p className="text-sm text-muted-foreground">No content created yet for this section.</p> : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
