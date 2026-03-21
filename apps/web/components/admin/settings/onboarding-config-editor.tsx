"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { SectionHeader } from "../section-header";
import {
  useGetOnboardingConfigQuery,
  useUpdateOnboardingConfigMutation,
} from "../../../lib/apiSlice";

type FieldType = "text" | "number" | "dropdown" | "date";

export type OnboardingFieldDraft = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  visible: boolean;
  optionsLines: string;
  optionsByTeam: Record<string, string>;
};

export type RequiredDocDraft = {
  id: string;
  label: string;
  required: boolean;
};

const FIELD_TYPES: FieldType[] = ["text", "number", "dropdown", "date"];
const TIERS = ["PHP", "PHP_Plus", "PHP_Premium"] as const;

function normalizeField(raw: unknown): OnboardingFieldDraft {
  const o = raw as Record<string, unknown>;
  const type = FIELD_TYPES.includes(o?.type as FieldType) ? (o.type as FieldType) : "text";
  const options = Array.isArray(o?.options) ? (o.options as string[]).map(String) : [];
  const obt =
    o?.optionsByTeam && typeof o.optionsByTeam === "object" && !Array.isArray(o.optionsByTeam)
      ? (o.optionsByTeam as Record<string, string[]>)
      : {};
  const optionsByTeam: Record<string, string> = {};
  for (const [k, v] of Object.entries(obt)) {
    optionsByTeam[k] = Array.isArray(v) ? v.join("\n") : "";
  }
  return {
    id: String(o?.id ?? ""),
    label: String(o?.label ?? ""),
    type,
    required: Boolean(o?.required),
    visible: o?.visible !== false,
    optionsLines: options.join("\n"),
    optionsByTeam,
  };
}

function fieldToApi(f: OnboardingFieldDraft, teamNames: string[]): Record<string, unknown> {
  const options = f.optionsLines
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Record<string, unknown> = {
    id: f.id.trim(),
    label: f.label.trim(),
    type: f.type,
    required: f.required,
    visible: f.visible,
  };
  if (f.type === "dropdown" && options.length) {
    out.options = options;
  }
  if (f.id === "level" && teamNames.length) {
    const obt: Record<string, string[]> = {};
    for (const team of teamNames) {
      const lines = (f.optionsByTeam[team] ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length) obt[team] = lines;
    }
    if (Object.keys(obt).length) {
      out.optionsByTeam = obt;
    }
  }
  return out;
}

function applyConfigRecord(
  cfg: Record<string, unknown>,
  setters: {
    setVersion: (v: number) => void;
    setFields: (f: OnboardingFieldDraft[]) => void;
    setRequiredDocuments: (d: RequiredDocDraft[]) => void;
    setWelcomeMessage: (s: string) => void;
    setCoachMessage: (s: string) => void;
    setDefaultProgramTier: (s: string) => void;
    setApprovalWorkflow: (w: "manual" | "auto") => void;
    setNotes: (s: string) => void;
    setPhpPlusTabsLines: (s: string) => void;
  }
) {
  setters.setVersion(typeof cfg.version === "number" ? cfg.version : 1);
  const rawFields = Array.isArray(cfg.fields) ? cfg.fields : [];
  setters.setFields(rawFields.length ? rawFields.map(normalizeField) : []);
  const docs = Array.isArray(cfg.requiredDocuments) ? cfg.requiredDocuments : [];
  setters.setRequiredDocuments(
    docs.map((d: unknown) => {
      const o = d && typeof d === "object" ? (d as Record<string, unknown>) : {};
      return {
        id: String(o.id ?? ""),
        label: String(o.label ?? ""),
        required: Boolean(o.required),
      };
    })
  );
  setters.setWelcomeMessage(typeof cfg.welcomeMessage === "string" ? cfg.welcomeMessage : "");
  setters.setCoachMessage(typeof cfg.coachMessage === "string" ? cfg.coachMessage : "");
  const tier = cfg.defaultProgramTier;
  setters.setDefaultProgramTier(
    typeof tier === "string" && TIERS.includes(tier as (typeof TIERS)[number]) ? tier : "PHP"
  );
  setters.setApprovalWorkflow(cfg.approvalWorkflow === "auto" ? "auto" : "manual");
  setters.setNotes(typeof cfg.notes === "string" ? cfg.notes : "");
  const tabs = Array.isArray(cfg.phpPlusProgramTabs) ? cfg.phpPlusProgramTabs : [];
  setters.setPhpPlusTabsLines(tabs.map((t) => String(t)).join("\n"));
}

export function OnboardingConfigEditor() {
  const { data, isLoading, isError, refetch, fulfilledTimeStamp } = useGetOnboardingConfigQuery();
  const [updateConfig, { isLoading: isSaving }] = useUpdateOnboardingConfigMutation();

  const [version, setVersion] = useState(1);
  const [fields, setFields] = useState<OnboardingFieldDraft[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocDraft[]>([]);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [coachMessage, setCoachMessage] = useState("");
  const [defaultProgramTier, setDefaultProgramTier] = useState<string>("PHP");
  const [approvalWorkflow, setApprovalWorkflow] = useState<"manual" | "auto">("manual");
  const [notes, setNotes] = useState("");
  const [phpPlusTabsLines, setPhpPlusTabsLines] = useState("");

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /** RTK Query `fulfilledTimeStamp` when we last applied server config (load + refetch after save). */
  const [lastHydratedFulfilled, setLastHydratedFulfilled] = useState<number | null>(null);

  const applyFromServerConfig = useCallback((cfg: unknown) => {
    if (!cfg || typeof cfg !== "object") return;
    applyConfigRecord(cfg as Record<string, unknown>, {
      setVersion,
      setFields,
      setRequiredDocuments,
      setWelcomeMessage,
      setCoachMessage,
      setDefaultProgramTier,
      setApprovalWorkflow,
      setNotes,
      setPhpPlusTabsLines,
    });
  }, []);

  const teamNames = useMemo(() => {
    const teamField = fields.find((f) => f.id === "team");
    if (!teamField) return [];
    return teamField.optionsLines
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [fields]);

  if (
    typeof fulfilledTimeStamp === "number" &&
    fulfilledTimeStamp !== lastHydratedFulfilled &&
    data?.config
  ) {
    setLastHydratedFulfilled(fulfilledTimeStamp);
    applyFromServerConfig(data.config);
  }

  const handleSave = async () => {
    setMessage(null);
    if (!fields.length || fields.some((f) => !f.id.trim() || !f.label.trim())) {
      setMessage({ type: "err", text: "Each field needs an id and label." });
      return;
    }
    if (!requiredDocuments.length) {
      setMessage({ type: "err", text: "Add at least one required document entry (or a placeholder)." });
      return;
    }
    const payload = {
      version,
      fields: fields.map((f) => fieldToApi(f, teamNames)),
      requiredDocuments: requiredDocuments.map((d) => ({
        id: d.id.trim(),
        label: d.label.trim(),
        required: d.required,
      })),
      welcomeMessage: welcomeMessage.trim() || null,
      coachMessage: coachMessage.trim() || null,
      defaultProgramTier,
      approvalWorkflow,
      notes: notes.trim() || null,
      phpPlusProgramTabs:
        phpPlusTabsLines
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean).length > 0
          ? phpPlusTabsLines
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
    };
    try {
      await updateConfig(payload).unwrap();
      setMessage({ type: "ok", text: "Onboarding configuration saved. Mobile app will pick this up on next config fetch." });
      void refetch();
    } catch (e: unknown) {
      const err = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
      const data = err.data && typeof err.data === "object" ? (err.data as Record<string, unknown>) : undefined;
      const details = data?.details;
      const extra =
        details && typeof details === "object"
          ? JSON.stringify(details)
          : (typeof data?.error === "string" ? data.error : null) ||
            (typeof err.message === "string" ? err.message : null) ||
            "Save failed.";
      setMessage({ type: "err", text: String(extra) });
    }
  };

  const updateField = (index: number, patch: Partial<OnboardingFieldDraft>) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const moveField = (index: number, dir: -1 | 1) => {
    setFields((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading onboarding config…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Could not load config.{" "}
        <Button variant="outline" size="sm" className="ml-2" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {message ? (
        <div
          className={
            message.type === "ok"
              ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200"
              : "rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200"
          }
        >
          {message.text}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <SectionHeader
            title="Global settings"
            description="Messages and defaults shown during mobile onboarding."
          />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Config version</Label>
            <Input
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">Bump when you make breaking changes; stored with the config row.</p>
          </div>
          <div className="space-y-2">
            <Label>Default program tier</Label>
            <Select value={defaultProgramTier} onChange={(e) => setDefaultProgramTier(e.target.value)}>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Approval workflow</Label>
            <Select
              value={approvalWorkflow}
              onChange={(e) => setApprovalWorkflow(e.target.value === "auto" ? "auto" : "manual")}
            >
              <option value="manual">Manual (coach review)</option>
              <option value="auto">Auto</option>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Welcome message</Label>
            <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Coach message</Label>
            <Textarea value={coachMessage} onChange={(e) => setCoachMessage(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Internal notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>PHP Plus tab labels (one per line)</Label>
            <Textarea
              value={phpPlusTabsLines}
              onChange={(e) => setPhpPlusTabsLines(e.target.value)}
              rows={4}
              placeholder="Program&#10;Warmups&#10;…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader
              title="Form fields"
              description="Order matches the mobile onboarding steps. Use dropdown + options for team and level; level can narrow choices per team."
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setFields((prev) => [
                  ...prev,
                  {
                    id: `field_${Date.now()}`,
                    label: "New field",
                    type: "text",
                    required: false,
                    visible: true,
                    optionsLines: "",
                    optionsByTeam: {},
                  },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={`${field.id}-${index}`}
              className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3"
            >
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => moveField(index, -1)} disabled={index === 0}>
                  Up
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => moveField(index, 1)}
                  disabled={index === fields.length - 1}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Field id</Label>
                  <Input value={field.id} onChange={(e) => updateField(index, { id: e.target.value })} placeholder="e.g. team" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Label</Label>
                  <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FieldType })}>
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.visible}
                    onChange={(e) => updateField(index, { visible: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  Visible
                </label>
              </div>
              {field.type === "dropdown" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Options (one per line)</Label>
                  <Textarea
                    value={field.optionsLines}
                    onChange={(e) => updateField(index, { optionsLines: e.target.value })}
                    rows={4}
                    placeholder="Team A&#10;Team B"
                  />
                </div>
              ) : null}
              {field.id === "level" && teamNames.length > 0 ? (
                <div className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Level options per team (from team field)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {teamNames.map((team) => (
                      <div key={team} className="space-y-1">
                        <Label className="text-xs">{team}</Label>
                        <Textarea
                          value={field.optionsByTeam[team] ?? ""}
                          onChange={(e) =>
                            updateField(index, {
                              optionsByTeam: { ...field.optionsByTeam, [team]: e.target.value },
                            })
                          }
                          rows={3}
                          placeholder="U12&#10;U14"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader title="Required documents" description="Shown in onboarding document checklist." />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setRequiredDocuments((prev) => [...prev, { id: `doc_${Date.now()}`, label: "", required: true }])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add document
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {requiredDocuments.map((doc, index) => (
            <div key={doc.id} className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
              <div className="min-w-[120px] flex-1 space-y-1">
                <Label className="text-xs">Id</Label>
                <Input
                  value={doc.id}
                  onChange={(e) =>
                    setRequiredDocuments((prev) =>
                      prev.map((d, i) => (i === index ? { ...d, id: e.target.value } : d))
                    )
                  }
                />
              </div>
              <div className="min-w-[180px] flex-[2] space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={doc.label}
                  onChange={(e) =>
                    setRequiredDocuments((prev) =>
                      prev.map((d, i) => (i === index ? { ...d, label: e.target.value } : d))
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={doc.required}
                  onChange={(e) =>
                    setRequiredDocuments((prev) =>
                      prev.map((d, i) => (i === index ? { ...d, required: e.target.checked } : d))
                    )
                  }
                  className="h-4 w-4"
                />
                Required
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => setRequiredDocuments((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save onboarding config"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => data?.config && applyFromServerConfig(data.config)}
          disabled={isSaving}
        >
          Reset to last loaded
        </Button>
      </div>
    </div>
  );
}
