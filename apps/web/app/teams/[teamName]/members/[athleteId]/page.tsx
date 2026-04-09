"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AdminShell } from "../../../../../components/admin/shell";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Select } from "../../../../../components/ui/select";
import { Textarea } from "../../../../../components/ui/textarea";
import { SectionHeader } from "../../../../../components/admin/section-header";

type TeamMemberDetails = {
  athleteId: number;
  athleteUserId?: number | null;
  team: string;
  athleteName: string;
  birthDate: string | null;
  trainingPerWeek: number | null;
  currentProgramTier: string | null;
  injuries: string | null;
  growthNotes: string | null;
  performanceGoals: string | null;
  equipmentAccess: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  guardianUserId?: number | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  relationToAthlete: string | null;
};

type AdminUser = {
  id: number;
  role?: string | null;
  athleteId?: number | null;
};

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] ?? ""
  );
}

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function parseLines(value: unknown) {
  if (Array.isArray(value)) {
    const rows = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return rows.length ? rows : [""];
  }
  if (typeof value === "string") {
    const rows = value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    return rows.length ? rows : [""];
  }
  return [""];
}

function joinLines(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean);
}

export default function TeamMemberDetailPage() {
  const params = useParams<{ teamName: string; athleteId: string }>();
  const encodedTeamName = String(params.teamName ?? "");
  const teamName = useMemo(
    () => decodeURIComponent(encodedTeamName),
    [encodedTeamName],
  );
  const athleteId = Number.parseInt(String(params.athleteId ?? "0"), 10);

  const [details, setDetails] = useState<TeamMemberDetails | null>(null);
  const [form, setForm] = useState({
    athleteName: "",
    birthDate: "",
    trainingPerWeek: "",
    currentProgramTier: "",
    injuries: [""],
    growthNotes: [""],
    performanceGoals: [""],
    equipmentAccess: [""],
    guardianEmail: "",
    guardianPhone: "",
    relationToAthlete: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [passwordInput, setPasswordInput] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [passwordEmailSent, setPasswordEmailSent] = useState<boolean | null>(
    null,
  );

  const loadOnboardingFallback = async () => {
    const usersResponse = await fetch("/api/backend/admin/users", {
      credentials: "include",
    });
    const usersPayload = await usersResponse.json().catch(() => ({}));
    if (!usersResponse.ok) return null;

    const matchedUser = (
      Array.isArray(usersPayload?.users) ? usersPayload.users : []
    ).find(
      (user: AdminUser) =>
        user.role === "guardian" && Number(user.athleteId) === athleteId,
    );
    if (!matchedUser?.id) return null;

    const onboardingResponse = await fetch(
      `/api/backend/admin/users/${matchedUser.id}/onboarding`,
      { credentials: "include" },
    );
    const onboardingPayload = await onboardingResponse.json().catch(() => ({}));
    if (!onboardingResponse.ok) return null;
    return onboardingPayload?.athlete ?? null;
  };

  const loadMember = async () => {
    if (!teamName || !Number.isFinite(athleteId) || athleteId <= 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`,
        {
          credentials: "include",
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load team member.");
      }
      const next = payload as TeamMemberDetails;
      const needsFallback =
        !next.injuries &&
        !next.growthNotes &&
        !next.performanceGoals &&
        !next.equipmentAccess;
      const fallbackAthlete = needsFallback
        ? await loadOnboardingFallback()
        : null;

      setDetails(next);
      setForm({
        athleteName: next.athleteName ?? "",
        birthDate: next.birthDate ?? "",
        trainingPerWeek:
          next.trainingPerWeek != null ? String(next.trainingPerWeek) : "",
        currentProgramTier: next.currentProgramTier ?? "",
        injuries: parseLines(next.injuries ?? fallbackAthlete?.injuries ?? ""),
        growthNotes: parseLines(
          next.growthNotes ?? fallbackAthlete?.growthNotes ?? "",
        ),
        performanceGoals: parseLines(
          next.performanceGoals ?? fallbackAthlete?.performanceGoals ?? "",
        ),
        equipmentAccess: parseLines(
          next.equipmentAccess ?? fallbackAthlete?.equipmentAccess ?? "",
        ),
        guardianEmail: next.guardianEmail ?? "",
        guardianPhone: next.guardianPhone ?? "",
        relationToAthlete: next.relationToAthlete ?? "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load team member.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMember();
  }, [teamName, athleteId]);

  const resetPassword = async () => {
    setNotice(null);
    setError(null);
    setTemporaryPassword(null);
    setPasswordEmailSent(null);

    // Youth athletes sign in as the guardian. If a guardian account exists, always reset that.
    // Fall back to athlete user only when no guardian login is attached (e.g. adult athletes).
    const targetUserId = details?.guardianUserId ?? details?.athleteUserId;
    if (!targetUserId) {
      setError("No user account is linked to this member.");
      return;
    }

    setIsResettingPassword(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(
        `/api/backend/admin/users/${targetUserId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            temporaryPassword: passwordInput.trim() || null,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to reset password.");
      }

      setTemporaryPassword(
        typeof payload?.temporaryPassword === "string"
          ? payload.temporaryPassword
          : null,
      );
      setPasswordEmailSent(
        typeof payload?.emailSent === "boolean" ? payload.emailSent : null,
      );
      setNotice("Password reset.");
      setPasswordInput("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset password.",
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const saveMember = async () => {
    setNotice(null);
    setError(null);
    setIsSaving(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(
        `/api/backend/admin/teams/${encodeURIComponent(teamName)}/members/${athleteId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
          },
          body: JSON.stringify({
            athleteName: form.athleteName.trim(),
            birthDate: form.birthDate.trim() || null,
            trainingPerWeek: Number.parseInt(form.trainingPerWeek, 10),
            currentProgramTier: form.currentProgramTier || null,
            injuries: joinLines(form.injuries),
            growthNotes: joinLines(form.growthNotes).join("\n") || null,
            performanceGoals:
              joinLines(form.performanceGoals).join("\n") || null,
            equipmentAccess: joinLines(form.equipmentAccess).join("\n") || null,
            guardianEmail: form.guardianEmail.trim() || null,
            guardianPhone: form.guardianPhone.trim() || null,
            relationToAthlete: form.relationToAthlete.trim() || null,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save member.");
      }
      setNotice("Member updated.");
      await loadMember();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save member.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderMultiField = (
    label: string,
    values: string[],
    onChange: (next: string[]) => void,
    colSpanClass = "",
  ) => (
    <div className={`space-y-1 ${colSpanClass}`.trim()}>
      <Label>{label}</Label>
      <div className="space-y-2">
        {values.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-start gap-2">
            <Textarea
              rows={2}
              value={item}
              onChange={(event) =>
                onChange(
                  values.map((v, i) => (i === index ? event.target.value : v)),
                )
              }
            />
            {values.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...values, ""])}
        >
          Add another
        </Button>
      </div>
    </div>
  );

  return (
    <AdminShell
      title={details?.athleteName || "Team member"}
      subtitle={`Team: ${teamName || "—"}`}
    >
      <div className="grid gap-6">
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        <Card>
          <CardContent className="pt-6">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/teams/${encodeURIComponent(teamName)}`}>
                Back to team
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Member details"
              description="Edit athlete and guardian information for this team member."
            />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading member details...
              </p>
            ) : (
              <>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Athlete name</Label>
                  <Input
                    value={form.athleteName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        athleteName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Birth date</Label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birthDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Training/week</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.trainingPerWeek}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        trainingPerWeek: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Program tier</Label>
                  <Select
                    value={form.currentProgramTier}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currentProgramTier: event.target.value,
                      }))
                    }
                  >
                    <option value="">No tier</option>
                    <option value="PHP">PHP Program</option>
                    <option value="PHP_Premium">PHP Premium</option>
                    <option value="PHP_Premium_Plus">PHP Premium Plus</option>
                    <option value="PHP_Pro">PHP Pro</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Guardian email</Label>
                  <Input
                    type="email"
                    value={form.guardianEmail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        guardianEmail: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Guardian phone</Label>
                  <Input
                    value={form.guardianPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        guardianPhone: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Relation</Label>
                  <Input
                    value={form.relationToAthlete}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        relationToAthlete: event.target.value,
                      }))
                    }
                  />
                </div>

                {renderMultiField(
                  "Injuries / history",
                  form.injuries,
                  (next) =>
                    setForm((current) => ({ ...current, injuries: next })),
                  "sm:col-span-2",
                )}
                {renderMultiField("Growth notes", form.growthNotes, (next) =>
                  setForm((current) => ({ ...current, growthNotes: next })),
                )}
                {renderMultiField(
                  "Performance goals",
                  form.performanceGoals,
                  (next) =>
                    setForm((current) => ({
                      ...current,
                      performanceGoals: next,
                    })),
                )}
                {renderMultiField(
                  "Equipment access",
                  form.equipmentAccess,
                  (next) =>
                    setForm((current) => ({
                      ...current,
                      equipmentAccess: next,
                    })),
                  "sm:col-span-2",
                )}

                <div className="sm:col-span-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Created: {formatDate(details?.createdAt ?? null)} · Updated:{" "}
                    {formatDate(details?.updatedAt ?? null)}
                  </p>
                  <Button
                    type="button"
                    onClick={() => void saveMember()}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save member"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Password"
              description="Passwords can’t be viewed. For youth athletes, reset the guardian login password and share the temporary password with the user."
            />
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading account info...
              </p>
            ) : details ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Resetting</Label>
                    <p className="text-sm text-muted-foreground">
                      {details.guardianUserId
                        ? "Guardian login (youth athletes)"
                        : "Athlete login (no guardian attached)"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label>New temporary password (optional)</Label>
                    <Input
                      type="password"
                      placeholder="Leave blank to generate a secure password"
                      value={passwordInput}
                      onChange={(event) => setPasswordInput(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    A reset will invalidate existing sessions.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void resetPassword()}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? "Resetting..." : "Reset password"}
                  </Button>
                </div>

                {temporaryPassword ? (
                  <div className="rounded-2xl border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">Temporary password</p>
                    <p className="mt-1 break-all font-mono">
                      {temporaryPassword}
                    </p>
                    {passwordEmailSent != null ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Email sent: {passwordEmailSent ? "Yes" : "No"}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No member loaded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
