"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, Loader2, RefreshCw, User } from "lucide-react";
import { toast } from "@/lib/toast";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  useCreateMediaUploadUrlMutation,
  useGetOnboardingConfigQuery,
  useProvisionAdultAthleteMutation,
  useProvisionGuardianMutation,
} from "../../../lib/apiSlice";

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

function generateAdminProvisionPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < 20; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)] ?? "A";
  }
  return out;
}

export default function AddUserPage() {
  return (
    <Suspense fallback={null}>
      <AddUserPageInner />
    </Suspense>
  );
}

function AddUserPageInner() {
  const searchParams = useSearchParams();
  const { data: configData, isLoading: configLoading } = useGetOnboardingConfigQuery();
  const [provision, { isLoading: isSubmitting }] = useProvisionGuardianMutation();
  const [provisionAdult, { isLoading: isSubmittingAdult }] = useProvisionAdultAthleteMutation();
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();

  const termsVersion = configData?.config?.termsVersion ?? "1.0";
  const privacyVersion = configData?.config?.privacyVersion ?? "1.0";

  const [formType, setFormType] = useState<"youth" | "adult">("youth");
  const [email, setEmail] = useState("");
  const [guardianDisplayName, setGuardianDisplayName] = useState("");
  const [athleteName, setAthleteName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [athleteProfilePicture, setAthleteProfilePicture] = useState("");
  const [team, setTeam] = useState("");
  const [trainingPerWeek, setTrainingPerWeek] = useState("3");
  const [injuries, setInjuries] = useState<string[]>([""]);
  const [growthNotes, setGrowthNotes] = useState<string[]>([""]);
  const [performanceGoals, setPerformanceGoals] = useState<string[]>([""]);
  const [equipmentAccess, setEquipmentAccess] = useState<string[]>([""]);
  const [parentPhone, setParentPhone] = useState("");
  const [relationToAthlete, setRelationToAthlete] = useState("");
  const [desiredProgramType, setDesiredProgramType] = useState<"PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro">("PHP");
  const [planPaymentType, setPlanPaymentType] = useState<"monthly" | "upfront">("monthly");
  const [planCommitmentMonths, setPlanCommitmentMonths] = useState<6 | 12>(6);
  const [isUploadingAthletePhoto, setIsUploadingAthletePhoto] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"generated" | "manual">("generated");
  const [generatedPassword, setGeneratedPassword] = useState<string>(() => generateAdminProvisionPassword());
  const [manualPassword, setManualPassword] = useState("");
  const [lastProvisionSummary, setLastProvisionSummary] = useState<{
    accountType: "youth" | "adult";
    email: string;
    emailSent: boolean;
  } | null>(null);

  useEffect(() => {
    const prefTeam = searchParams.get("team");
    const prefType = searchParams.get("type");
    if (prefType === "adult" || prefType === "youth") {
      setFormType(prefType);
    }
    if (prefTeam) {
      setTeam(prefTeam);
    }
  }, [searchParams]);

  const submitting = isSubmitting || isSubmittingAdult;

  const canSubmit = useMemo(() => {
    const hasCore =
      email.trim().length > 3 &&
      athleteName.trim().length > 0 &&
      birthDate.trim().length > 0 &&
      trainingPerWeek.trim().length > 0;

    if (!hasCore) return false;
    if (formType === "youth") return guardianDisplayName.trim().length > 0;
    return true;
  }, [formType, email, guardianDisplayName, athleteName, birthDate, trainingPerWeek]);

  const resetForm = () => {
    setEmail("");
    setGuardianDisplayName("");
    setAthleteName("");
    setBirthDate("");
    setAthleteProfilePicture("");
    setTeam("");
    setTrainingPerWeek("3");
    setInjuries([""]);
    setGrowthNotes([""]);
    setPerformanceGoals([""]);
    setEquipmentAccess([""]);
    setParentPhone("");
    setRelationToAthlete("");
    setDesiredProgramType("PHP");
    setPlanPaymentType("monthly");
    setPlanCommitmentMonths(6);
    setPasswordMode("generated");
    setGeneratedPassword(generateAdminProvisionPassword());
    setManualPassword("");
  };

  const handleAthletePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAthletePhoto(true);
	      const { uploadUrl, publicUrl } = await createUploadUrl({
	        folder: "athlete-profile-pictures",
	        fileName: `${Date.now()}-${file.name}`,
	        contentType: file.type,
	        sizeBytes: file.size,
	        client: "web",
	      }).unwrap();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setAthleteProfilePicture(publicUrl);
      toast.success("Athlete photo uploaded.");
    } catch {
      toast.error("Failed to upload athlete photo.");
    } finally {
      setIsUploadingAthletePhoto(false);
      event.target.value = "";
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPassword =
      passwordMode === "manual" ? manualPassword.trim() : generatedPassword.trim();
    if (selectedPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    const n = Number.parseInt(trainingPerWeek, 10);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Training days per week must be a valid number.");
      return;
    }
    if (formType === "adult") {
      const birth = new Date(birthDate);
      if (Number.isNaN(birth.getTime())) {
        toast.error("Birth date is invalid.");
        return;
      }
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
      if (age < 18) {
        toast.error("Adult athletes must be 18 or older.");
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
            team: team.trim() || null,
            trainingPerWeek: n,
            injuries: cleanedInjuries.length ? cleanedInjuries : undefined,
            growthNotes: cleanedGrowthNotes.length ? cleanedGrowthNotes.join("\n") : null,
            performanceGoals: cleanedPerformanceGoals.length ? cleanedPerformanceGoals.join("\n") : null,
            equipmentAccess: cleanedEquipmentAccess.length ? cleanedEquipmentAccess.join("\n") : null,
            parentPhone: parentPhone.trim() || null,
            relationToAthlete: relationToAthlete.trim() || null,
            desiredProgramType,
            athleteProfilePicture: athleteProfilePicture.trim() || null,
            planPaymentType,
            planCommitmentMonths,
            termsVersion,
            privacyVersion,
            appVersion: "admin-web",
            initialPassword: selectedPassword,
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
            athleteProfilePicture: athleteProfilePicture.trim() || null,
            planPaymentType,
            planCommitmentMonths,
            termsVersion,
            privacyVersion,
            appVersion: "admin-web",
            initialPassword: selectedPassword,
          }).unwrap();
      setLastProvisionSummary({
        accountType: formType,
        email: email.trim(),
        emailSent: result.emailSent,
      });
      resetForm();
      if (result.emailSent) {
        toast.success("Admin created user successfully. Password email sent.");
      } else {
        toast.success("Admin created user, but password email could not be sent.");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, formType === "youth" ? "Could not create youth user." : "Could not create adult athlete."));
    }
  };

  return (
    <AdminShell
      title="Add user"
      subtitle="Create youth athletes with guardians or adult athletes with direct login access."
      actions={
        <Button variant="outline" size="sm" render={<Link href="/users" />}>
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Button>
      }
    >
      <div className="mx-auto grid max-w-3xl gap-6">
        {configLoading ? (
          <p className="text-sm text-muted-foreground">Loading onboarding defaults…</p>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-6">
          {lastProvisionSummary ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="text-emerald-700 dark:text-emerald-300">Admin created account</CardTitle>
                <CardDescription>
                  {lastProvisionSummary.accountType === "youth" ? "Youth athlete + guardian login created." : "Adult athlete login created."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                <p>
                  <span className="font-medium">Email:</span> {lastProvisionSummary.email}
                </p>
                <p>
                  <span className="font-medium">Email sent:</span> {lastProvisionSummary.emailSent ? "Yes" : "No"}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Athlete type</CardTitle>
              <CardDescription>Choose who you are registering.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={formType} onValueChange={(value) => setFormType((value ?? "youth") as "youth" | "adult")}>
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Athlete photo (optional)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-input bg-secondary/20">
                    {athleteProfilePicture ? (
                      <img src={athleteProfilePicture} alt="Athlete preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                    {isUploadingAthletePhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm hover:bg-secondary/70">
                      <Camera className="h-4 w-4" />
                      Upload photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAthletePhotoUpload}
                        disabled={isUploadingAthletePhoto}
                      />
                    </label>
                    {athleteProfilePicture ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 justify-start px-2 text-xs"
                        onClick={() => setAthleteProfilePicture("")}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                </div>
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
                  <Label htmlFor="team">Assign to team (optional)</Label>
                  <Input
                    id="team"
                    value={team}
                    onChange={(ev) => setTeam(ev.target.value)}
                    placeholder="Leave blank if no team"
                  />
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
                  items={TIER_OPTIONS}
                  value={desiredProgramType}
                  onValueChange={(val) =>
                    setDesiredProgramType((val ?? "PHP") as "PHP" | "PHP_Premium" | "PHP_Premium_Plus" | "PHP_Pro")
                  }
                >
                  <SelectTrigger id="desiredProgramType"><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    {TIER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="planPaymentType">Payment type</Label>
                <Select
                  items={[
                    { label: "Pay monthly", value: "monthly" },
                    { label: "Pay upfront (full)", value: "upfront" },
                  ]}
                  value={planPaymentType}
                  onValueChange={(val) => setPlanPaymentType((val ?? "monthly") as "monthly" | "upfront")}
                >
                  <SelectTrigger id="planPaymentType"><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="monthly">Pay monthly</SelectItem>
                    <SelectItem value="upfront">Pay upfront (full)</SelectItem>
                  </SelectPopup>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="planCommitmentMonths">Commitment</Label>
                <Select
                  items={[
                    { label: "6 months", value: "6" },
                    { label: "12 months", value: "12" },
                  ]}
                  value={String(planCommitmentMonths)}
                  onValueChange={(val) => setPlanCommitmentMonths(Number(val ?? "6") as 6 | 12)}
                >
                  <SelectTrigger id="planCommitmentMonths"><SelectValue /></SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectPopup>
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

          <Card>
            <CardHeader>
              <CardTitle>Login password</CardTitle>
              <CardDescription>
                Choose how to set the first password. This password is sent in the welcome email.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Tabs value={passwordMode} onValueChange={(value) => setPasswordMode((value ?? "generated") as "generated" | "manual")}>
                <div className="overflow-x-auto pb-1">
                  <TabsList className="min-w-max">
                    <TabsTrigger value="generated">Generate random password</TabsTrigger>
                    <TabsTrigger value="manual">Admin sets password</TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>

              {passwordMode === "generated" ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="generatedPassword">Generated password</Label>
                    <Input
                      id="generatedPassword"
                      value={generatedPassword}
                      readOnly
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-2"
                    onClick={() => setGeneratedPassword(generateAdminProvisionPassword())}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="manualPassword">Admin password</Label>
                  <Input
                    id="manualPassword"
                    type="text"
                    value={manualPassword}
                    onChange={(ev) => setManualPassword(ev.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required={passwordMode === "manual"}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" render={<Link href="/users" />}>
              Cancel
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
