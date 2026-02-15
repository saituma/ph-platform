"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, UploadCloud } from "lucide-react";
import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import {
  useGetAdminProfileQuery,
  useUpdateAdminPreferencesMutation,
  useUpdateAdminProfileMutation,
  useChangePasswordMutation,
} from "../../lib/apiSlice";

export default function ProfilePage() {
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isLoading } = useGetAdminProfileQuery();
  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateAdminProfileMutation();
  const [updatePreferences, { isLoading: isSavingPreferences }] = useUpdateAdminPreferencesMutation();
  const [changePassword, { isLoading: isSavingPassword }] = useChangePasswordMutation();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    title: "",
    bio: "",
  });

  const [preferences, setPreferences] = useState({
    timezone: "Europe/London",
    notificationSummary: "Weekly",
    workStartHour: "08",
    workStartMinute: "00",
    workEndHour: "18",
    workEndMinute: "00",
  });

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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const clearProfileMessage = () => {
    setTimeout(() => setProfileMessage(null), 2500);
  };

  const clearPreferencesMessage = () => {
    setTimeout(() => setPreferencesMessage(null), 2500);
  };

  const clearPasswordMessage = () => {
    setTimeout(() => setPasswordMessage(null), 2500);
  };

  useEffect(() => {
    if (!data?.user || !data?.settings) return;
    setProfile({
      name: data.user.name ?? "",
      email: data.user.email ?? "",
      title: data.settings.title ?? "",
      bio: data.settings.bio ?? "",
    });
    setPreferences({
      timezone: data.settings.timezone ?? "Europe/London",
      notificationSummary: data.settings.notificationSummary ?? "Weekly",
      workStartHour: String(data.settings.workStartHour ?? 8).padStart(2, "0"),
      workStartMinute: String(data.settings.workStartMinute ?? 0).padStart(2, "0"),
      workEndHour: String(data.settings.workEndHour ?? 18).padStart(2, "0"),
      workEndMinute: String(data.settings.workEndMinute ?? 0).padStart(2, "0"),
    });
    setProfileImage(data.user.profilePicture ?? null);
  }, [data]);

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
    } catch (error: any) {
      const message = error?.data?.error || "Failed to save profile.";
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
    } catch (error: any) {
      const message = error?.data?.error || "Failed to save preferences.";
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
      .catch((error: any) => {
        const message = error?.data?.error || "Failed to update password.";
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
                        reader.onload = () => setProfileImage(reader.result as string);
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
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
            <Input
              placeholder="Email"
              disabled={isLoading}
              value={profile.email}
              onChange={(event) => setProfile({ ...profile, email: event.target.value })}
            />
            <Input
              placeholder="Title"
              disabled={isLoading}
              value={profile.title}
              onChange={(event) => setProfile({ ...profile, title: event.target.value })}
            />
            <Textarea
              placeholder="Bio"
              disabled={isLoading}
              value={profile.bio}
              onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
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
                value={preferences.timezone}
                disabled={isLoading}
                onChange={(event) =>
                  setPreferences({ ...preferences, timezone: event.target.value })
                }
              >
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Stockholm">Europe/Stockholm</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="Europe/Madrid">Europe/Madrid</option>
                <option value="Europe/Rome">Europe/Rome</option>
                <option value="Europe/Oslo">Europe/Oslo</option>
                <option value="Europe/Copenhagen">Europe/Copenhagen</option>
                <option value="Europe/Brussels">Europe/Brussels</option>
                <option value="Europe/Lisbon">Europe/Lisbon</option>
                <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                <option value="Europe/Zurich">Europe/Zurich</option>
                <option value="Europe/Dublin">Europe/Dublin</option>
                <option value="Europe/Athens">Europe/Athens</option>
                <option value="Europe/Prague">Europe/Prague</option>
                <option value="Europe/Warsaw">Europe/Warsaw</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Denver">America/Denver</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="America/Phoenix">America/Phoenix</option>
                <option value="America/Toronto">America/Toronto</option>
                <option value="America/Vancouver">America/Vancouver</option>
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</option>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Notification summary</p>
              <Select
                value={preferences.notificationSummary}
                disabled={isLoading}
                onChange={(event) =>
                  setPreferences({ ...preferences, notificationSummary: event.target.value })
                }
              >
                <option value="Real-time">Real-time</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Off">Off</option>
              </Select>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Working hours</p>
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                  <span className="text-xs font-medium text-muted-foreground">Start</span>
                  <Select
                    value={preferences.workStartHour}
                    disabled={isLoading}
                    onChange={(event) =>
                      setPreferences({ ...preferences, workStartHour: event.target.value })
                    }
                  >
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <option key={`start-hour-${hour}`} value={String(hour).padStart(2, "0")}>
                        {String(hour).padStart(2, "0")}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={preferences.workStartMinute}
                    disabled={isLoading}
                    onChange={(event) =>
                      setPreferences({ ...preferences, workStartMinute: event.target.value })
                    }
                  >
                    {["00", "15", "30", "45"].map((minute) => (
                      <option key={`start-min-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                  <span className="text-xs font-medium text-muted-foreground">End</span>
                  <Select
                    value={preferences.workEndHour}
                    disabled={isLoading}
                    onChange={(event) =>
                      setPreferences({ ...preferences, workEndHour: event.target.value })
                    }
                  >
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <option key={`end-hour-${hour}`} value={String(hour).padStart(2, "0")}>
                        {String(hour).padStart(2, "0")}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={preferences.workEndMinute}
                    disabled={isLoading}
                    onChange={(event) =>
                      setPreferences({ ...preferences, workEndMinute: event.target.value })
                    }
                  >
                    {["00", "15", "30", "45"].map((minute) => (
                      <option key={`end-min-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
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
