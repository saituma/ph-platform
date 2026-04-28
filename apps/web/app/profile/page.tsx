"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, UploadCloud } from "lucide-react";
import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import {
  useGetAdminProfileQuery,
  useUpdateAdminPreferencesMutation,
  useUpdateAdminProfileMutation,
  useChangePasswordMutation,
} from "../../lib/apiSlice";

type ApiErrorLike = {
  data?: { error?: string };
  message?: string;
};

type ProfileState = {
  name: string;
  email: string;
  title: string;
  bio: string;
};

type PreferencesState = {
  timezone: string;
  notificationSummary: string;
  workStartHour: string;
  workStartMinute: string;
  workEndHour: string;
  workEndMinute: string;
};

const profileTimezoneItems = [
  { label: "Europe/London", value: "Europe/London" },
  { label: "Europe/Stockholm", value: "Europe/Stockholm" },
  { label: "Europe/Paris", value: "Europe/Paris" },
  { label: "Europe/Berlin", value: "Europe/Berlin" },
  { label: "Europe/Madrid", value: "Europe/Madrid" },
  { label: "Europe/Rome", value: "Europe/Rome" },
  { label: "Europe/Oslo", value: "Europe/Oslo" },
  { label: "Europe/Copenhagen", value: "Europe/Copenhagen" },
  { label: "Europe/Brussels", value: "Europe/Brussels" },
  { label: "Europe/Lisbon", value: "Europe/Lisbon" },
  { label: "Europe/Amsterdam", value: "Europe/Amsterdam" },
  { label: "Europe/Zurich", value: "Europe/Zurich" },
  { label: "Europe/Dublin", value: "Europe/Dublin" },
  { label: "Europe/Athens", value: "Europe/Athens" },
  { label: "Europe/Prague", value: "Europe/Prague" },
  { label: "Europe/Warsaw", value: "Europe/Warsaw" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "America/Chicago", value: "America/Chicago" },
  { label: "America/Denver", value: "America/Denver" },
  { label: "America/Los_Angeles", value: "America/Los_Angeles" },
  { label: "America/Phoenix", value: "America/Phoenix" },
  { label: "America/Toronto", value: "America/Toronto" },
  { label: "America/Vancouver", value: "America/Vancouver" },
  { label: "America/Mexico_City", value: "America/Mexico_City" },
  { label: "America/Sao_Paulo", value: "America/Sao_Paulo" },
  { label: "America/Bogota", value: "America/Bogota" },
  { label: "America/Argentina/Buenos_Aires", value: "America/Argentina/Buenos_Aires" },
];

const profileNotifItems = [
  { label: "Real-time", value: "Real-time" },
  { label: "Daily", value: "Daily" },
  { label: "Weekly", value: "Weekly" },
  { label: "Off", value: "Off" },
];

const hourItems = Array.from({ length: 24 }, (_, hour) => ({
  label: String(hour).padStart(2, "0"),
  value: String(hour).padStart(2, "0"),
}));

const minuteItems = ["00", "15", "30", "45"].map((m) => ({ label: m, value: m }));

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const apiError = error as ApiErrorLike;
    if (typeof apiError.data?.error === "string") return apiError.data.error;
    if (typeof apiError.message === "string") return apiError.message;
  }
  return fallback;
}

export default function ProfilePage() {
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isLoading } = useGetAdminProfileQuery();
  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateAdminProfileMutation();
  const [updatePreferences, { isLoading: isSavingPreferences }] = useUpdateAdminPreferencesMutation();
  const [changePassword, { isLoading: isSavingPassword }] = useChangePasswordMutation();

  const initialProfile = useMemo<ProfileState>(
    () => ({
      name: data?.user?.name ?? "",
      email: data?.user?.email ?? "",
      title: data?.settings?.title ?? "",
      bio: data?.settings?.bio ?? "",
    }),
    [data?.settings?.bio, data?.settings?.title, data?.user?.email, data?.user?.name]
  );
  const initialPreferences = useMemo<PreferencesState>(
    () => ({
      timezone: data?.settings?.timezone ?? "Europe/London",
      notificationSummary: data?.settings?.notificationSummary ?? "Weekly",
      workStartHour: String(data?.settings?.workStartHour ?? 8).padStart(2, "0"),
      workStartMinute: String(data?.settings?.workStartMinute ?? 0).padStart(2, "0"),
      workEndHour: String(data?.settings?.workEndHour ?? 18).padStart(2, "0"),
      workEndMinute: String(data?.settings?.workEndMinute ?? 0).padStart(2, "0"),
    }),
    [
      data?.settings?.notificationSummary,
      data?.settings?.timezone,
      data?.settings?.workEndHour,
      data?.settings?.workEndMinute,
      data?.settings?.workStartHour,
      data?.settings?.workStartMinute,
    ]
  );
  const initialProfileImage = data?.user?.profilePicture ?? null;

  const [profileDraft, setProfileDraft] = useState<ProfileState | null>(null);
  const [preferencesDraft, setPreferencesDraft] = useState<PreferencesState | null>(null);
  const [profileImageDraft, setProfileImageDraft] = useState<string | null | undefined>(undefined);

  const profile = profileDraft ?? initialProfile;
  const preferences = preferencesDraft ?? initialPreferences;
  const profileImage = profileImageDraft === undefined ? initialProfileImage : profileImageDraft;

  const [security, setSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const clearProfileMessage = () => {
    setTimeout(() => setProfileMessage(null), 2500);
  };

  const clearPreferencesMessage = () => {
    setTimeout(() => setPreferencesMessage(null), 2500);
  };

  const clearPasswordMessage = () => {
    setTimeout(() => setPasswordMessage(null), 2500);
  };

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    try {
      await updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        title: profile.title?.trim() || null,
        bio: profile.bio?.trim() || null,
        profilePicture: profileImage,
      }).unwrap();
      setProfileMessage({ type: "success", text: "Profile saved successfully." });
      clearProfileMessage();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to save profile.");
      setProfileMessage({ type: "error", text: message });
    }
  };

  const handleSavePreferences = async () => {
    setPreferencesMessage(null);
    try {
      await updatePreferences({
        timezone: preferences.timezone,
        notificationSummary: preferences.notificationSummary,
        workStartHour: Number(preferences.workStartHour),
        workStartMinute: Number(preferences.workStartMinute),
        workEndHour: Number(preferences.workEndHour),
        workEndMinute: Number(preferences.workEndMinute),
      }).unwrap();
      setPreferencesMessage({ type: "success", text: "Preferences saved successfully." });
      clearPreferencesMessage();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to save preferences.");
      setPreferencesMessage({ type: "error", text: message });
    }
  };

  const handleUpdatePassword = () => {
    setPasswordMessage(null);
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Please fill in all password fields." });
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    changePassword({
      oldPassword: security.currentPassword,
      newPassword: security.newPassword,
    })
      .unwrap()
      .then(() => {
        setPasswordMessage({ type: "success", text: "Password updated successfully." });
        clearPasswordMessage();
        setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, "Failed to update password.");
        setPasswordMessage({ type: "error", text: message });
      });
  };

  return (
    <AdminShell
      title="Profile"
      subtitle="Edit admin data and preferences."
      actions={
        <Button onClick={handleSaveProfile} disabled={isSavingProfile || isLoading}>
          {isSavingProfile ? "Saving..." : "Save Changes"}
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="Admin Profile" description="Public coach details." />
          </CardHeader>
          <CardContent className="space-y-3">
            {profileMessage ? (
              <div
                className={
                  profileMessage.type === "success"
                    ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
                    : "rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                }
              >
                {profileMessage.text}
              </div>
            ) : null}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary text-lg font-semibold text-foreground">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    "MG"
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Profile photo</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60">
                    <UploadCloud className="h-4 w-4" />
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setProfileImageDraft(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <Input
              placeholder="Name"
              disabled={isLoading}
              value={profile.name}
              onChange={(event) => setProfileDraft({ ...profile, name: event.target.value })}
            />
            <Input
              placeholder="Email"
              disabled={isLoading}
              value={profile.email}
              onChange={(event) => setProfileDraft({ ...profile, email: event.target.value })}
            />
            <Input
              placeholder="Title"
              disabled={isLoading}
              value={profile.title}
              onChange={(event) => setProfileDraft({ ...profile, title: event.target.value })}
            />
            <Textarea
              placeholder="Bio"
              disabled={isLoading}
              value={profile.bio}
              onChange={(event) => setProfileDraft({ ...profile, bio: event.target.value })}
            />
            <Button onClick={handleSaveProfile} disabled={isSavingProfile || isLoading}>
              {isSavingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SectionHeader title="Preferences" description="Admin preferences." />
          </CardHeader>
          <CardContent className="space-y-4">
            {preferencesMessage ? (
              <div
                className={
                  preferencesMessage.type === "success"
                    ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
                    : "rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                }
              >
                {preferencesMessage.text}
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Timezone</p>
              <Select
                items={profileTimezoneItems}
                value={preferences.timezone}
                onValueChange={(value) =>
                  setPreferencesDraft({ ...preferences, timezone: value ?? "" })
                }
                disabled={isLoading}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {profileTimezoneItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Notification summary</p>
              <Select
                items={profileNotifItems}
                value={preferences.notificationSummary}
                onValueChange={(value) =>
                  setPreferencesDraft({ ...preferences, notificationSummary: value ?? "" })
                }
                disabled={isLoading}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  {profileNotifItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Working hours</p>
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                  <span className="text-xs font-medium text-muted-foreground">Start</span>
                  <Select
                    items={hourItems}
                    value={preferences.workStartHour}
                    onValueChange={(value) =>
                      setPreferencesDraft({ ...preferences, workStartHour: value ?? "" })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {hourItems.map((item) => (
                        <SelectItem key={`start-hour-${item.value}`} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <Select
                    items={minuteItems}
                    value={preferences.workStartMinute}
                    onValueChange={(value) =>
                      setPreferencesDraft({ ...preferences, workStartMinute: value ?? "" })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {minuteItems.map((item) => (
                        <SelectItem key={`start-min-${item.value}`} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                  <span className="text-xs font-medium text-muted-foreground">End</span>
                  <Select
                    items={hourItems}
                    value={preferences.workEndHour}
                    onValueChange={(value) =>
                      setPreferencesDraft({ ...preferences, workEndHour: value ?? "" })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {hourItems.map((item) => (
                        <SelectItem key={`end-hour-${item.value}`} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <Select
                    items={minuteItems}
                    value={preferences.workEndMinute}
                    onValueChange={(value) =>
                      setPreferencesDraft({ ...preferences, workEndMinute: value ?? "" })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {minuteItems.map((item) => (
                        <SelectItem key={`end-min-${item.value}`} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </div>
            </div>
            <Button onClick={handleSavePreferences} disabled={isSavingPreferences || isLoading}>
              {isSavingPreferences ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <SectionHeader title="Security" description="Update password and security." />
          </CardHeader>
          <CardContent className="space-y-3">
            {passwordMessage ? (
              <div
                className={
                  passwordMessage.type === "success"
                    ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200"
                    : "rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
                }
              >
                {passwordMessage.text}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Enter your old password to change it. Password changes are managed in account security.
            </p>
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                placeholder="Old password"
                value={security.currentPassword}
                onChange={(event) =>
                  setSecurity({ ...security, currentPassword: event.target.value })
                }
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Input
                  type={showPasswords.next ? "text" : "password"}
                  placeholder="New password"
                  value={security.newPassword}
                  onChange={(event) =>
                    setSecurity({ ...security, newPassword: event.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, next: !prev.next }))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={security.confirmPassword}
                  onChange={(event) =>
                    setSecurity({ ...security, confirmPassword: event.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleUpdatePassword} disabled={isSavingPassword}>
              {isSavingPassword ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
