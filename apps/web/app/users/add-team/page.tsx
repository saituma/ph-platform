"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import { useGetOnboardingConfigQuery, useProvisionGuardianMutation } from "../../../lib/apiSlice";

const TIER_OPTIONS: { value: "PHP" | "PHP_Plus" | "PHP_Premium"; label: string }[] = [
  { value: "PHP", label: "Program (PHP)" },
  { value: "PHP_Plus", label: "Plus" },
  { value: "PHP_Premium", label: "Premium" },
];

type MemberDraft = {
  email: string;
  guardianDisplayName: string;
  athleteName: string;
  birthDate: string;
  trainingPerWeek: string;
  parentPhone: string | null;
  relationToAthlete: string | null;
};

function createEmptyMember(): MemberDraft {
  return {
    email: "",
    guardianDisplayName: "",
    athleteName: "",
    birthDate: "",
    trainingPerWeek: "3",
    parentPhone: null,
    relationToAthlete: null,
  };
}

function validateMember(member: MemberDraft) {
  if (!member.email.trim().includes("@")) return "Valid email is required.";
  if (!member.guardianDisplayName.trim()) return "Guardian name is required.";
  if (!member.athleteName.trim()) return "Athlete name is required.";
  if (!member.birthDate.trim()) return "Birth date is required.";
  const trainingPerWeek = Number.parseInt(member.trainingPerWeek, 10);
  if (!Number.isFinite(trainingPerWeek) || trainingPerWeek < 0) {
    return "Training days/week must be a valid non-negative number.";
  }
  return null;
}

export default function AddTeamPage() {
  const { data: configData, isLoading: configLoading } = useGetOnboardingConfigQuery();
  const [provision, { isLoading: isSubmitting }] = useProvisionGuardianMutation();

  const termsVersion = configData?.config?.termsVersion ?? "1.0";
  const privacyVersion = configData?.config?.privacyVersion ?? "1.0";

  const [teamName, setTeamName] = useState("");
  const [desiredProgramType, setDesiredProgramType] = useState<"PHP" | "PHP_Plus" | "PHP_Premium">("PHP");
  const [injuries, setInjuries] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [performanceGoals, setPerformanceGoals] = useState("");
  const [equipmentAccess, setEquipmentAccess] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([createEmptyMember()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    emailed: number;
    failed: Array<{ member: number; email: string; reason: string }>;
  } | null>(null);

  const memberErrors = useMemo(() => members.map((member) => validateMember(member)), [members]);
  const canSubmit = teamName.trim().length > 0 && members.length > 0 && memberErrors.every((error) => !error);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setResult(null);

    if (!canSubmit) {
      setFormError("Complete team details and fix roster errors before creating accounts.");
      return;
    }

    const failed: Array<{ member: number; email: string; reason: string }> = [];
    let created = 0;
    let emailed = 0;

    for (let index = 0; index < members.length; index += 1) {
      const member = members[index];
      const error = validateMember(member);
      if (error) {
        failed.push({
          member: index + 1,
          email: member.email.trim(),
          reason: error,
        });
        continue;
      }
      const trainingPerWeek = Number.parseInt(member.trainingPerWeek, 10);
      try {
        const response = await provision({
          email: member.email.trim(),
          guardianDisplayName: member.guardianDisplayName.trim(),
          athleteName: member.athleteName.trim(),
          birthDate: member.birthDate.trim(),
          team: teamName.trim(),
          trainingPerWeek,
          injuries: injuries.trim() || undefined,
          growthNotes: growthNotes.trim() || null,
          performanceGoals: performanceGoals.trim() || null,
          equipmentAccess: equipmentAccess.trim() || null,
          parentPhone: member.parentPhone?.trim() || null,
          relationToAthlete: member.relationToAthlete?.trim() || null,
          desiredProgramType,
          termsVersion,
          privacyVersion,
          appVersion: "admin-web",
        }).unwrap();
        created += 1;
        if (response.emailSent) emailed += 1;
      } catch (err: any) {
        const reason = err?.data?.error ?? err?.message ?? "Could not create user.";
        failed.push({
          member: index + 1,
          email: member.email.trim(),
          reason: typeof reason === "string" ? reason : "Could not create user.",
        });
      }
    }

    setResult({ created, emailed, failed });
  };

  return (
    <AdminShell
      title="Add team"
      subtitle="Bulk-create guardian + athlete accounts for a full team roster."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/users" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      }
    >
      <div className="mx-auto grid max-w-4xl gap-6">
        {configLoading ? <p className="text-sm text-muted-foreground">Loading onboarding defaults…</p> : null}

        {formError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>
        ) : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-medium">
              Team import complete: {result.created} created, {result.emailed} welcome emails sent.
            </p>
            {result.failed.length ? (
              <div className="mt-3 space-y-2 text-amber-200/90">
                <p>{result.failed.length} member(s) failed:</p>
                {result.failed.slice(0, 8).map((item) => (
                  <p key={`${item.member}-${item.email}`}>
                    Member {item.member} ({item.email || "no email"}): {item.reason}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href="/users">Go to users</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Team defaults</CardTitle>
              <CardDescription>These values apply to every athlete created in this import.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team name</Label>
                <Input
                  id="teamName"
                  required
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="e.g. U14 Phoenix"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desiredProgramType">Desired program tier</Label>
                <Select
                  id="desiredProgramType"
                  value={desiredProgramType}
                  onChange={(event) =>
                    setDesiredProgramType(event.target.value as "PHP" | "PHP_Plus" | "PHP_Premium")
                  }
                >
                  {TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="injuries">Injuries / history</Label>
                <Textarea
                  id="injuries"
                  rows={2}
                  value={injuries}
                  onChange={(event) => setInjuries(event.target.value)}
                  placeholder="Optional team-wide default notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="growthNotes">Growth notes</Label>
                <Textarea
                  id="growthNotes"
                  rows={2}
                  value={growthNotes}
                  onChange={(event) => setGrowthNotes(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="performanceGoals">Performance goals</Label>
                <Textarea
                  id="performanceGoals"
                  rows={2}
                  value={performanceGoals}
                  onChange={(event) => setPerformanceGoals(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="equipmentAccess">Equipment access</Label>
                <Textarea
                  id="equipmentAccess"
                  rows={2}
                  value={equipmentAccess}
                  onChange={(event) => setEquipmentAccess(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team members</CardTitle>
              <CardDescription>
                Fill one form per member. Each member creates one guardian login and one athlete profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member, index) => (
                <div key={`member-${index}`} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Member {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={members.length === 1}
                      onClick={() =>
                        setMembers((current) => current.filter((_, rowIndex) => rowIndex !== index))
                      }
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="email"
                      placeholder="Guardian email"
                      value={member.email}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, email: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Guardian name"
                      value={member.guardianDisplayName}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, guardianDisplayName: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Athlete name"
                      value={member.athleteName}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, athleteName: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      type="date"
                      value={member.birthDate}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, birthDate: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Training days / week"
                      value={member.trainingPerWeek}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, trainingPerWeek: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Parent phone (optional)"
                      value={member.parentPhone ?? ""}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, parentPhone: event.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="Relation to athlete (optional)"
                      value={member.relationToAthlete ?? ""}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, relationToAthlete: event.target.value } : row
                          )
                        )
                      }
                    />
                  </div>
                  {memberErrors[index] ? (
                    <p className="mt-2 text-xs text-red-300">{memberErrors[index]}</p>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setMembers((current) => [...current, createEmptyMember()])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add member
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting || configLoading}>
              {isSubmitting ? "Creating team…" : "Create team & send passwords"}
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
