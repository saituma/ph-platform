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
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useGetOnboardingConfigQuery, useProvisionAdultAthleteMutation, useProvisionGuardianMutation } from "../../../lib/apiSlice";

const TIER_OPTIONS: { value: "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro"; label: string }[] = [
  { value: "PHP", label: "PHP Program" },
  { value: "PHP_Premium", label: "PHP Premium" },
  { value: "PHP_Premium_Plus", label: "PHP Premium Plus" },
  { value: "PHP_Pro", label: "PHP Pro" },
];

type ApiErrorLike = {
  data?: { error?: string };
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const apiError = error as ApiErrorLike;
    if (typeof apiError.data?.error === "string") return apiError.data.error;
    if (typeof apiError.message === "string") return apiError.message;
  }
  return fallback;
}

export default function AddUserPage() {
  const router = useRouter();
  const { data: configData, isLoading: configLoading } = useGetOnboardingConfigQuery();
  const [provision, { isLoading: isSubmitting }] = useProvisionGuardianMutation();
  const [provisionAdult, { isLoading: isSubmittingAdult }] = useProvisionAdultAthleteMutation();

  const termsVersion = configData?.config?.termsVersion ?? "1.0";
  const privacyVersion = configData?.config?.privacyVersion ?? "1.0";

  const [formType, setFormType] = useState<"youth" | "adult">("youth");
  const [email, setEmail] = useState("");
  const [guardianDisplayName, setGuardianDisplayName] = useState("");
  const [athleteName, setAthleteName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [team, setTeam] = useState("");
  const [trainingPerWeek, setTrainingPerWeek] = useState("3");
  const [injuries, setInjuries] = useState<string[]>([""]);
  const [growthNotes, setGrowthNotes] = useState<string[]>([""]);
  const [performanceGoals, setPerformanceGoals] = useState<string[]>([""]);
  const [equipmentAccess, setEquipmentAccess] = useState<string[]>([""]);
  const [parentPhone, setParentPhone] = useState("");
  const [relationToAthlete, setRelationToAthlete] = useState("");
  const [planExpiresAt, setPlanExpiresAt] = useState("");
  const [desiredProgramType, setDesiredProgramType] = useState<"PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro">("PHP");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ userId: number; emailSent: boolean } | null>(null);

  const submitting = isSubmitting || isSubmittingAdult;

  const canSubmit = useMemo(() => {
    const hasCore =
      email.trim().length > 3 &&
      athleteName.trim().length > 0 &&
      birthDate.trim().length > 0 &&
      trainingPerWeek.trim().length > 0;

    if (!hasCore) return false;
    if (formType === "youth" && team.trim().length === 0) return false;
    if (formType === "youth") return guardianDisplayName.trim().length > 0;
    return true;
  }, [formType, email, guardianDisplayName, athleteName, birthDate, team, trainingPerWeek]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    const n = Number.parseInt(trainingPerWeek, 10);
    if (!Number.isFinite(n) || n < 0) {
      setFormError("Training days per week must be a valid number.");
      return;
    }
    if (formType === "adult") {
      const birth = new Date(birthDate);
      if (Number.isNaN(birth.getTime())) {
        setFormError("Birth date is invalid.");
        return;
      }
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
      if (age < 18) {
        setFormError("Adult athletes must be 18 or older.");
        return;
      }
    }
    const cleanedInjuries = injuries.map((item) => item.trim()).filter((item) => item.length > 0);
    const cleanedGrowthNotes = growthNotes.map((item) => item.trim()).filter((item) => item.length > 0);
    const cleanedPerformanceGoals = performanceGoals.map((item) => item.trim()).filter((item) => item.length > 0);
    const cleanedEquipmentAccess = equipmentAccess.map((item) => item.trim()).filter((item) => item.length > 0);
    try {
      const result = formType === "youth"
        ? await provision({
            email: email.trim(),
            guardianDisplayName: guardianDisplayName.trim(),
            athleteName: athleteName.trim(),
            birthDate: birthDate.trim(),
            team: team.trim(),
            trainingPerWeek: n,
            injuries: cleanedInjuries.length ? cleanedInjuries : undefined,
            growthNotes: cleanedGrowthNotes.length ? cleanedGrowthNotes.join("\n") : null,
            performanceGoals: cleanedPerformanceGoals.length ? cleanedPerformanceGoals.join("\n") : null,
            equipmentAccess: cleanedEquipmentAccess.length ? cleanedEquipmentAccess.join("\n") : null,
            parentPhone: parentPhone.trim() || null,
            relationToAthlete: relationToAthlete.trim() || null,
            desiredProgramType,
            termsVersion,
            privacyVersion,
            appVersion: "admin-web",
          }).unwrap()
        : await provisionAdult({
            email: email.trim(),
            athleteName: athleteName.trim(),
            birthDate: birthDate.trim(),
            trainingPerWeek: n,
            injuries: cleanedInjuries.length ? cleanedInjuries : undefined,
            growthNotes: cleanedGrowthNotes.length ? cleanedGrowthNotes.join("\n") : null,
            performanceGoals: cleanedPerformanceGoals.length ? cleanedPerformanceGoals.join("\n") : null,
            equipmentAccess: cleanedEquipmentAccess.length ? cleanedEquipmentAccess.join("\n") : null,
            desiredProgramType,
            planExpiresAt: planExpiresAt.trim() || null,
            termsVersion,
            privacyVersion,
            appVersion: "admin-web",
          }).unwrap();
      setSuccess({ userId: result.userId, emailSent: result.emailSent });
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, formType === "youth" ? "Could not create youth user." : "Could not create adult athlete."));
    }
  };

  return (
    <AdminShell
      title="Add user"
      subtitle="Create youth athletes with guardians or adult athletes with direct login access."
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
              <CardTitle>Athlete type</CardTitle>
              <CardDescription>Choose who you are registering.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={formType} onValueChange={(value) => setFormType(value as "youth" | "adult")}>
                <TabsList>
                  <TabsTrigger value="youth">Youth athlete</TabsTrigger>
                  <TabsTrigger value="adult">Adult athlete</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {formType === "youth" ? (
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
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Adult athlete account</CardTitle>
                <CardDescription>Adult athlete login email and identity (no guardian account).</CardDescription>
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
                    placeholder="adult@example.com"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{formType === "youth" ? "Athlete" : "Adult athlete details"}</CardTitle>
              <CardDescription>
                {formType === "youth"
                  ? "Same details you would collect during mobile onboarding."
                  : "Adult athlete profile, tier assignment, and optional plan expiry."}
              </CardDescription>
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
              {formType === "youth" ? (
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Input id="team" required value={team} onChange={(ev) => setTeam(ev.target.value)} />
                </div>
              ) : null}
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
                    setDesiredProgramType(ev.target.value as "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro")
                  }
                >
                  {TIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              {formType === "adult" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="planExpiresAt">Plan expires on (optional)</Label>
                  <Input
                    id="planExpiresAt"
                    type="date"
                    value={planExpiresAt}
                    onChange={(ev) => setPlanExpiresAt(ev.target.value)}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training & health</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label>Injuries / history</Label>
                <div className="space-y-2">
                  {injuries.map((value, index) => (
                    <div key={`injury-${index}`} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(ev) =>
                          setInjuries((prev) => prev.map((item, i) => (i === index ? ev.target.value : item)))
                        }
                        placeholder="Optional injury or history note"
                      />
                      {injuries.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInjuries((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setInjuries((prev) => [...prev, ""])}>
                    Add another
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Growth notes</Label>
                <div className="space-y-2">
                  {growthNotes.map((value, index) => (
                    <div key={`growth-${index}`} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(ev) =>
                          setGrowthNotes((prev) => prev.map((item, i) => (i === index ? ev.target.value : item)))
                        }
                        placeholder="Optional growth note"
                      />
                      {growthNotes.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setGrowthNotes((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setGrowthNotes((prev) => [...prev, ""])}>
                    Add another
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Performance goals</Label>
                <div className="space-y-2">
                  {performanceGoals.map((value, index) => (
                    <div key={`performance-${index}`} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(ev) =>
                          setPerformanceGoals((prev) => prev.map((item, i) => (i === index ? ev.target.value : item)))
                        }
                        placeholder="Optional performance goal"
                      />
                      {performanceGoals.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPerformanceGoals((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPerformanceGoals((prev) => [...prev, ""])}
                  >
                    Add another
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Equipment access</Label>
                <div className="space-y-2">
                  {equipmentAccess.map((value, index) => (
                    <div key={`equipment-${index}`} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(ev) =>
                          setEquipmentAccess((prev) => prev.map((item, i) => (i === index ? ev.target.value : item)))
                        }
                        placeholder="Optional equipment note"
                      />
                      {equipmentAccess.length > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEquipmentAccess((prev) => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEquipmentAccess((prev) => [...prev, ""])}
                  >
                    Add another
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {formType === "youth" ? (
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
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" asChild>
              <Link href="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting || configLoading}>
              {submitting ? "Creating…" : formType === "youth" ? "Create youth user & send password" : "Create adult athlete & send password"}
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
