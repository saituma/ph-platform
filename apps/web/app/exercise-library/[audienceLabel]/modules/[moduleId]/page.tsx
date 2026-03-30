"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../../../components/admin/shell";
import { SectionHeader } from "../../../../../components/admin/section-header";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import {
  AudienceWorkspace,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../../../../components/admin/training-content-v2/api";

export default function ModuleSessionsPage() {
  const params = useParams<{ audienceLabel: string; moduleId: string }>();
  const audienceLabel = useMemo(
    () => normalizeAudienceLabelInput(decodeURIComponent(String(params.audienceLabel ?? "All"))),
    [params.audienceLabel],
  );
  const moduleId = Number(params.moduleId);
  const [workspace, setWorkspace] = useState<AudienceWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionForm, setSessionForm] = useState({ id: null as number | null, title: "", dayLength: "7", order: "" });

  const loadWorkspace = async () => {
    try {
      setError(null);
      const data = await trainingContentRequest<AudienceWorkspace>(`/admin?audienceLabel=${encodeURIComponent(audienceLabel)}`);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load module.");
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [audienceLabel]);

  const module = workspace?.modules.find((item) => item.id === moduleId) ?? null;

  const saveSession = async () => {
    if (!module || !sessionForm.title.trim()) return;
    setIsSaving(true);
    try {
      if (sessionForm.id) {
        await trainingContentRequest(`/sessions/${sessionForm.id}`, {
          method: "PUT",
          body: JSON.stringify({
            title: sessionForm.title,
            dayLength: Number(sessionForm.dayLength) || 7,
            order: sessionForm.order.trim() ? Number(sessionForm.order) : null,
          }),
        });
      } else {
        await trainingContentRequest("/sessions", {
          method: "POST",
          body: JSON.stringify({
            moduleId: module.id,
            title: sessionForm.title,
            dayLength: Number(sessionForm.dayLength) || 7,
            order: sessionForm.order.trim() ? Number(sessionForm.order) : null,
          }),
        });
      }
      setSessionForm({ id: null, title: "", dayLength: "7", order: "" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save session.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    if (!window.confirm("Delete this session?")) return;
    setIsSaving(true);
    try {
      await trainingContentRequest(`/sessions/${sessionId}`, { method: "DELETE" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell title="Training content" subtitle={`Audience ${audienceLabel} -> module sessions`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}`}>
            <Button variant="outline">Back to audience</Button>
          </Link>
        </div>
        {error ? <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <CardHeader>
              <SectionHeader title={module ? module.title : "Sessions"} description="Create sessions here, then open a session page to manage warmup, main session, and cool down items." />
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Session name" value={sessionForm.title} onChange={(event) => setSessionForm((current) => ({ ...current, title: event.target.value }))} />
              <div className="flex gap-2">
                <Input placeholder="Length in days" value={sessionForm.dayLength} onChange={(event) => setSessionForm((current) => ({ ...current, dayLength: event.target.value }))} />
                <Input placeholder="Order" value={sessionForm.order} onChange={(event) => setSessionForm((current) => ({ ...current, order: event.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveSession} disabled={!module || isSaving}>
                  {sessionForm.id ? "Update" : "Add session"}
                </Button>
                {sessionForm.id ? (
                  <Button variant="ghost" onClick={() => setSessionForm({ id: null, title: "", dayLength: "7", order: "" })}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Session list" description="Open a session to manage its fixed blocks." />
            </CardHeader>
            <CardContent className="space-y-3">
              {module?.sessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-border p-4">
                  <p className="text-lg font-semibold text-foreground">{session.order}. {session.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session.dayLength} days · {session.items.length} content items
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/exercise-library/${encodeURIComponent(audienceLabel)}/modules/${moduleId}/sessions/${session.id}`}>
                      <Button size="sm">Open session</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSessionForm({
                          id: session.id,
                          title: session.title,
                          dayLength: String(session.dayLength),
                          order: String(session.order),
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void deleteSession(session.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {!module?.sessions.length ? <p className="text-sm text-muted-foreground">No sessions created yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
