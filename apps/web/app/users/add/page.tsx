"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

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

export default function AddUserPage() {
  const router = useRouter();
  const { data: configData, isLoading: configLoading } = useGetOnboardingConfigQuery();
  const [provision, { isLoading: isSubmitting }] = useProvisionGuardianMutation();

  const termsVersion = configData?.config?.termsVersion ?? "1.0";
  const privacyVersion = configData?.config?.privacyVersion ?? "1.0";

  const [email, setEmail] = useState("");
  const [guardianDisplayName, setGuardianDisplayName] = useState("");
  const [athleteName, setAthleteName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [team, setTeam] = useState("");
  const [trainingPerWeek, setTrainingPerWeek] = useState("3");
  const [injuries, setInjuries] = useState("");
  const [growthNotes, setGrowthNotes] = useState("");
  const [performanceGoals, setPerformanceGoals] = useState("");
  const [equipmentAccess, setEquipmentAccess] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [relationToAthlete, setRelationToAthlete] = useState("");
  const [desiredProgramType, setDesiredProgramType] = useState<"PHP" | "PHP_Plus" | "PHP_Premium">("PHP");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ userId: number; emailSent: boolean } | null>(null);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      guardianDisplayName.trim().length > 0 &&
      athleteName.trim().length > 0 &&
      birthDate.trim().length > 0 &&
      team.trim().length > 0 &&
      trainingPerWeek.trim().length > 0
    );
  }, [email, guardianDisplayName, athleteName, birthDate, team, trainingPerWeek]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    const n = Number.parseInt(trainingPerWeek, 10);
    if (!Number.isFinite(n) || n < 0) {
      setFormError("Training days per week must be a valid number.");
      return;
    }
    try {
      const result = await provision({
        email: email.trim(),
        guardianDisplayName: guardianDisplayName.trim(),
        athleteName: athleteName.trim(),
        birthDate: birthDate.trim(),
        team: team.trim(),
        trainingPerWeek: n,
        injuries: injuries.trim() || undefined,
        growthNotes: growthNotes.trim() || null,
        performanceGoals: performanceGoals.trim() || null,
        equipmentAccess: equipmentAccess.trim() || null,
        parentPhone: parentPhone.trim() || null,
        relationToAthlete: relationToAthlete.trim() || null,
        desiredProgramType,
        termsVersion,
        privacyVersion,
        appVersion: "admin-web",
      }).unwrap();
      setSuccess({ userId: result.userId, emailSent: result.emailSent });
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Could not create user.";
      setFormError(typeof msg === "string" ? msg : "Could not create user.");
    }
  };

  return (
    <AdminShell
      title="Add user"
      subtitle="Create a guardian login, complete onboarding on their behalf, and send a temporary password to their email."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/users" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
      }
    >
      <div className="mx-auto grid max-w-3xl gap-6">
        {configLoading ? (
          <p className="text-sm text-muted-foreground">Loading onboarding defaults…</p>
        ) : null}

        {formError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            <p className="font-medium">User created successfully.</p>
            {success.emailSent ? (
              <p className="mt-2 text-emerald-200/90">
                A temporary password was sent to their email. They should sign in on the mobile app and set a new password
                when prompted.
              </p>
            ) : (
              <p className="mt-2 text-amber-200/90">
                The account was created, but the welcome email could not be sent. Ask them to use &quot;Forgot
                password&quot; on the app, or contact support.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => router.push(`/users/${success.userId}`)}>
                Open profile
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => router.push("/users")}>
                All users
              </Button>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Guardian account</CardTitle>
              <CardDescription>Login email and display name for the parent or guardian app account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="parent@example.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="guardianDisplayName">Guardian name</Label>
                <Input
                  id="guardianDisplayName"
                  required
                  value={guardianDisplayName}
                  onChange={(ev) => setGuardianDisplayName(ev.target.value)}
                  placeholder="Full name"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Athlete</CardTitle>
              <CardDescription>Same details you would collect during mobile onboarding.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="athleteName">Athlete name</Label>
                <Input
                  id="athleteName"
                  required
                  value={athleteName}
                  onChange={(ev) => setAthleteName(ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Birth date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  required
                  value={birthDate}
                  onChange={(ev) => setBirthDate(ev.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Input id="team" required value={team} onChange={(ev) => setTeam(ev.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trainingPerWeek">Training days / week</Label>
                <Input
                  id="trainingPerWeek"
                  type="number"
                  min={0}
                  required
                  value={trainingPerWeek}
                  onChange={(ev) => setTrainingPerWeek(ev.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="desiredProgramType">Desired program tier</Label>
                <Select
                  id="desiredProgramType"
                  value={desiredProgramType}
                  onChange={(ev) =>
                    setDesiredProgramType(ev.target.value as "PHP" | "PHP_Plus" | "PHP_Premium")
                  }
                >
                  {TIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training & health</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="injuries">Injuries / history</Label>
                <Textarea id="injuries" value={injuries} onChange={(ev) => setInjuries(ev.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="growthNotes">Growth notes</Label>
                <Textarea id="growthNotes" value={growthNotes} onChange={(ev) => setGrowthNotes(ev.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="performanceGoals">Performance goals</Label>
                <Textarea
                  id="performanceGoals"
                  value={performanceGoals}
                  onChange={(ev) => setPerformanceGoals(ev.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipmentAccess">Equipment access</Label>
                <Textarea
                  id="equipmentAccess"
                  value={equipmentAccess}
                  onChange={(ev) => setEquipmentAccess(ev.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardian contact</CardTitle>
              <CardDescription>Parent phone and relationship; login email above is used for guardian email.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone</Label>
                <Input id="parentPhone" value={parentPhone} onChange={(ev) => setParentPhone(ev.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationToAthlete">Relation to athlete</Label>
                <Input
                  id="relationToAthlete"
                  value={relationToAthlete}
                  onChange={(ev) => setRelationToAthlete(ev.target.value)}
                  placeholder="e.g. Parent"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting || configLoading}>
              {isSubmitting ? "Creating…" : "Create user & send password"}
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
