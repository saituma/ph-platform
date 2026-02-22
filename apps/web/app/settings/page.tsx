"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Camera, Loader2, User } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import {
  useGetAdminProfileQuery,
  useUpdateAdminPreferencesMutation,
  useUpdateAdminProfileMutation,
  useChangePasswordMutation,
  useCreateMediaUploadUrlMutation,
} from "../../lib/apiSlice";

export default function SettingsPage() {
  const { data, isLoading } = useGetAdminProfileQuery();
  const [updateProfile, { isLoading: isSavingProfile }] = useUpdateAdminProfileMutation();
  const [updatePreferences, { isLoading: isSavingPreferences }] = useUpdateAdminPreferencesMutation();
  const [changePassword, { isLoading: isSavingPassword }] = useChangePasswordMutation();
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    profilePicture: "",
    title: "",
    bio: "",
  });

  const [createUploadUrl] = useCreateMediaUploadUrlMutation();
  const [isUploading, setIsUploading] = useState(false);

  const [preferences, setPreferences] = useState({
    timezone: "America/Chicago",
    notificationSummary: "Weekly",
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

  useEffect(() => {
    if (!data?.user || !data?.settings) return;
    setProfile({
      name: data.user.name ?? "",
      email: data.user.email ?? "",
      profilePicture: data.user.profilePicture ?? "",
      title: data.settings.title ?? "",
      bio: data.settings.bio ?? "",
    });
    setPreferences({
      timezone: data.settings.timezone ?? "America/Chicago",
      notificationSummary: data.settings.notificationSummary ?? "Weekly",
    });
  }, [data]);

  const handleSaveProfile = async (overrides?: any) => {
    setProfileMessage(null);
    try {
      await updateProfile({
        name: overrides?.name ?? profile.name.trim(),
        email: overrides?.email ?? profile.email.trim(),
        profilePicture: overrides?.profilePicture ?? (profile.profilePicture || null),
        title: overrides?.title ?? (profile.title?.trim() || null),
        bio: overrides?.bio ?? (profile.bio?.trim() || null),
      }).unwrap();
      setProfileMessage({ type: "success", text: "Profile updated." });
      setTimeout(() => setProfileMessage(null), 2000);
    } catch (error: any) {
      const message = error?.data?.error || "Failed to update profile.";
      setProfileMessage({ type: "error", text: message });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { uploadUrl, publicUrl } = await createUploadUrl({
        folder: "profile-pictures",
        fileName: `${Date.now()}-${file.name}`,
        contentType: file.type,
        sizeBytes: file.size,
      }).unwrap();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      setProfile((prev) => ({ ...prev, profilePicture: publicUrl }));
      await handleSaveProfile({ profilePicture: publicUrl });
    } catch (error) {
      setProfileMessage({ type: "error", text: "Failed to upload image." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePreferences = async () => {
    setPreferencesMessage(null);
    try {
      await updatePreferences({
        timezone: preferences.timezone,
        notificationSummary: preferences.notificationSummary,
      }).unwrap();
      setPreferencesMessage({ type: "success", text: "Preferences saved." });
      setTimeout(() => setPreferencesMessage(null), 2000);
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
        setTimeout(() => setPasswordMessage(null), 2000);
        setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
      })
      .catch((error: any) => {
        const message = error?.data?.error || "Failed to update password.";
        setPasswordMessage({ type: "error", text: message });
      });
  };

  return (
    <AdminShell title="Settings" subtitle="Profile settings stored in your account.">
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={`settings-skeleton-${index}`}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <SectionHeader title="Profile" description="Basic public profile details." />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mb-4 flex flex-col items-center gap-4">
                <div className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-primary/20 bg-secondary/20 transition-all hover:border-primary/40">
                  {profile.profilePicture ? (
                    <img
                      src={profile.profilePicture}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <User className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">Click image to upload</p>
                </div>
              </div>

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
              <Button onClick={() => handleSaveProfile()} disabled={isSavingProfile || isLoading}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeader title="Preferences" description="Notification and timezone settings." />
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
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="America/Denver">America/Denver</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="America/Phoenix">America/Phoenix</option>
                  <option value="America/Toronto">America/Toronto</option>
                  <option value="America/Vancouver">America/Vancouver</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
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
              <Button onClick={handleSavePreferences} disabled={isSavingPreferences || isLoading}>
                {isSavingPreferences ? "Saving..." : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <SectionHeader title="Security" description="Update your account password." />
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
                Enter your current password to set a new one.
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
      )}
    </AdminShell>
  );
}
