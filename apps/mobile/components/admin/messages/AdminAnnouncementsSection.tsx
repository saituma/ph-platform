import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { AdminCard } from "@/roles/admin/components/AdminCard";
import { Chip, SmallAction } from "@/components/admin/AdminShared";
import {
  AdminAnnouncementAudienceType,
  AdminAnnouncementItem,
  useAdminAnnouncements,
} from "@/hooks/admin/useAdminAnnouncements";

function formatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSchedule(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt && !endsAt) return "Permanent";
  if (startsAt && endsAt)
    return `Active ${formatTime(startsAt)} → ${formatTime(endsAt)}`;
  if (startsAt) return `Starts ${formatTime(startsAt)}`;
  return `Ends ${formatTime(endsAt)}`;
}

type Props = {
  controller: ReturnType<typeof useAdminAnnouncements>;
  canLoad: boolean;
};

const audienceTabs: Array<{ key: AdminAnnouncementAudienceType; label: string }> = [
  { key: "all", label: "All" },
  { key: "athlete_type", label: "Athlete" },
  { key: "team", label: "Team" },
  { key: "tier", label: "Tier" },
];

const tierOptions = ["PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"] as const;

export function AdminAnnouncementsSection({ controller, canLoad }: Props) {
  const { colors, isDark } = useAppTheme();

  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAnnouncementItem | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [audienceType, setAudienceType] = useState<AdminAnnouncementAudienceType>("all");
  const [athleteType, setAthleteType] = useState<"youth" | "adult">("youth");
  const [team, setTeam] = useState("");
  const [tier, setTier] = useState<(typeof tierOptions)[number]>("PHP");

  const [timingType, setTimingType] = useState<"permanent" | "scheduled">("permanent");
  const [startsAt, setStartsAt] = useState<Date>(new Date(Date.now() + 10 * 60 * 1000));
  const [endsAt, setEndsAt] = useState<Date>(new Date(Date.now() + 70 * 60 * 1000));

  useEffect(() => {
    if (!canLoad) return;
    void controller.load(false);
  }, [canLoad, controller.load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return controller.items;
    return controller.items.filter((item) => {
      const t = String(item.title ?? "").toLowerCase();
      const b = String(item.body ?? "").toLowerCase();
      return t.includes(q) || b.includes(q);
    });
  }, [controller.items, query]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setAudienceType("all");
    setAthleteType("youth");
    setTeam("");
    setTier("PHP");
    setTimingType("permanent");
    setEditorOpen(true);
  };

  const openEdit = (item: AdminAnnouncementItem) => {
    setEditing(item);
    setTitle(String(item.title ?? ""));
    setBody(String(item.body ?? ""));
    const rawAudience = (item.announcementAudienceType ?? "all") as any;
    const nextAudience: AdminAnnouncementAudienceType =
      rawAudience === "athlete_type" ||
      rawAudience === "team" ||
      rawAudience === "group" ||
      rawAudience === "tier" ||
      rawAudience === "all"
        ? rawAudience
        : "all";
    setAudienceType(nextAudience);

    const rawAthleteType = String(item.announcementAudienceAthleteType ?? "youth").toLowerCase();
    setAthleteType(rawAthleteType === "adult" ? "adult" : "youth");
    setTeam(String(item.announcementAudienceTeam ?? ""));

    const rawTier = String(item.announcementAudienceTier ?? "PHP");
    setTier(
      (tierOptions.includes(rawTier as any) ? rawTier : "PHP") as (typeof tierOptions)[number],
    );

    const scheduledStarts = item.announcementStartsAt ?? item.startsAt ?? null;
    const scheduledEnds = item.announcementEndsAt ?? item.endsAt ?? null;
    setTimingType(scheduledStarts || scheduledEnds ? "scheduled" : "permanent");
    if (scheduledStarts) {
      const d = new Date(scheduledStarts);
      if (!Number.isNaN(d.getTime())) setStartsAt(d);
    }
    if (scheduledEnds) {
      const d = new Date(scheduledEnds);
      if (!Number.isNaN(d.getTime())) setEndsAt(d);
    }
    setEditorOpen(true);
  };

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !controller.isBusy;

  const submit = async () => {
    if (!canSubmit) return;
    if (audienceType === "team" && !team.trim()) {
      Alert.alert("Missing team", "Enter a team name for this audience.");
      return;
    }
    if (timingType === "scheduled" && endsAt.getTime() <= startsAt.getTime()) {
      Alert.alert("Invalid schedule", "End time must be after the start time.");
      return;
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      audienceType,
      athleteType: audienceType === "athlete_type" ? athleteType : undefined,
      team: audienceType === "team" ? team.trim() : undefined,
      tier: audienceType === "tier" ? tier : undefined,
      startsAt: timingType === "scheduled" ? startsAt.toISOString() : undefined,
      endsAt: timingType === "scheduled" ? endsAt.toISOString() : undefined,
    };

    try {
      if (editing?.id != null) {
        const idNum = Number(editing.id);
        if (Number.isFinite(idNum) && idNum > 0) {
          await controller.update(idNum, payload);
        }
      } else {
        await controller.create(payload);
      }
      setEditorOpen(false);
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Action failed");
    }
  };

  const requestDelete = () => {
    if (!editing?.id) return;
    const idNum = Number(editing.id);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    Alert.alert("Delete announcement", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await controller.remove(idNum);
            setEditorOpen(false);
          } catch (e) {
            Alert.alert("Failed", e instanceof Error ? e.message : "Delete failed");
          }
        },
      },
    ]);
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <View className="flex-1 rounded-2xl border border-app/10 bg-card px-4 py-3">
          <TextInput
            className="text-[14px] font-outfit text-app"
            value={query}
            onChangeText={setQuery}
            placeholder="Search announcements..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <SmallAction label="New" tone="success" onPress={openCreate} />
      </View>

      {controller.loading && controller.items.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="100%" height={64} />
          <Skeleton width="100%" height={64} />
        </View>
      ) : controller.error ? (
        <Text className="text-sm font-outfit text-danger">{controller.error}</Text>
      ) : filtered.length === 0 ? (
        <Text className="text-sm font-outfit text-secondary">No announcements found.</Text>
      ) : (
        <View className="gap-3">
          {filtered.map((item) => {
            const starts = item.announcementStartsAt ?? item.startsAt ?? null;
            const ends = item.announcementEndsAt ?? item.endsAt ?? null;
            return (
              <Pressable
                key={String(item.id)}
                onPress={() => openEdit(item)}
                className="rounded-card border border-app/10 bg-card p-4 active:opacity-90"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text
                      className="text-[14px] font-clash font-bold text-app"
                      numberOfLines={1}
                    >
                      {String(item.title ?? "Announcement")}
                    </Text>
                    <Text
                      className="text-[11px] font-outfit text-secondary mt-1"
                      numberOfLines={1}
                    >
                      {formatSchedule(starts, ends)}
                    </Text>
                  </View>
                  <View
                    className={`px-2.5 py-1 rounded-full border ${
                      item.isActive
                        ? "bg-success-soft border-app/10"
                        : "bg-card border-app/10"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-outfit-bold uppercase tracking-widest ${
                        item.isActive ? "text-success" : "text-muted"
                      }`}
                    >
                      {item.isActive ? "Active" : "Draft"}
                    </Text>
                  </View>
                </View>
                {item.body ? (
                  <Text
                    className="text-[12px] font-outfit text-secondary mt-2"
                    numberOfLines={2}
                  >
                    {String(item.body)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal
        visible={editorOpen}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setEditorOpen(false)}
      >
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
          <View className="px-4 py-4 border-b border-app/10 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-clash font-bold text-app" numberOfLines={1}>
                {editing ? "Edit announcement" : "New announcement"}
              </Text>
              <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
                {editing ? `#${String(editing.id)}` : "Broadcast update"}
              </Text>
            </View>
            <SmallAction label="Close" tone="neutral" onPress={() => setEditorOpen(false)} />
          </View>

          <View className="flex-1 px-4 py-4">
            <AdminCard className="rounded-card-lg border border-app bg-card-elevated p-5">
              <View className="gap-3">
                <View>
                  <Text className="text-[12px] font-outfit-bold text-secondary uppercase tracking-widest mb-2">
                    Title
                  </Text>
                  <View className="rounded-2xl border border-app/10 bg-card px-4 py-3">
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Announcement title"
                      placeholderTextColor={colors.placeholder}
                      className="text-[14px] font-outfit text-app"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[12px] font-outfit-bold text-secondary uppercase tracking-widest mb-2">
                    Message
                  </Text>
                  <View className="rounded-2xl border border-app/10 bg-card px-4 py-3">
                    <TextInput
                      value={body}
                      onChangeText={setBody}
                      placeholder="Write the announcement..."
                      placeholderTextColor={colors.placeholder}
                      className="text-[14px] font-outfit text-app min-h-[120px]"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-[12px] font-outfit-bold text-secondary uppercase tracking-widest mb-2">
                    Audience
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {audienceTabs.map((tab) => (
                      <Chip
                        key={tab.key}
                        label={tab.label}
                        selected={audienceType === tab.key}
                        onPress={() => setAudienceType(tab.key)}
                      />
                    ))}
                  </View>
                  {audienceType === "athlete_type" ? (
                    <View className="flex-row gap-2 mt-3">
                      <Chip
                        label="Youth"
                        selected={athleteType === "youth"}
                        onPress={() => setAthleteType("youth")}
                      />
                      <Chip
                        label="Adult"
                        selected={athleteType === "adult"}
                        onPress={() => setAthleteType("adult")}
                      />
                    </View>
                  ) : null}
                  {audienceType === "team" ? (
                    <View className="mt-3 rounded-2xl border border-app/10 bg-card px-4 py-3">
                      <TextInput
                        value={team}
                        onChangeText={setTeam}
                        placeholder="Team name (exact)"
                        placeholderTextColor={colors.placeholder}
                        className="text-[14px] font-outfit text-app"
                      />
                    </View>
                  ) : null}
                  {audienceType === "tier" ? (
                    <View className="flex-row flex-wrap gap-2 mt-3">
                      {tierOptions.map((t) => (
                        <Chip
                          key={t}
                          label={t.replaceAll("_", " ")}
                          selected={tier === t}
                          onPress={() => setTier(t)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>

                <View>
                  <Text className="text-[12px] font-outfit-bold text-secondary uppercase tracking-widest mb-2">
                    Timing
                  </Text>
                  <View className="flex-row gap-2">
                    <Chip
                      label="Permanent"
                      selected={timingType === "permanent"}
                      onPress={() => setTimingType("permanent")}
                    />
                    <Chip
                      label="Scheduled"
                      selected={timingType === "scheduled"}
                      onPress={() => setTimingType("scheduled")}
                    />
                  </View>

                  {timingType === "scheduled" ? (
                    <View className="mt-3 gap-3">
                      <View className="rounded-2xl border border-app/10 bg-card p-3">
                        <Text className="text-[11px] font-outfit text-secondary mb-2">
                          Starts
                        </Text>
                        <DateTimePicker
                          value={startsAt}
                          mode="datetime"
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={(_, date) => {
                            if (date) setStartsAt(date);
                          }}
                          themeVariant={isDark ? "dark" : "light"}
                        />
                      </View>
                      <View className="rounded-2xl border border-app/10 bg-card p-3">
                        <Text className="text-[11px] font-outfit text-secondary mb-2">
                          Ends
                        </Text>
                        <DateTimePicker
                          value={endsAt}
                          mode="datetime"
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={(_, date) => {
                            if (date) setEndsAt(date);
                          }}
                          themeVariant={isDark ? "dark" : "light"}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>

                <View className="flex-row gap-2 pt-2">
                  <SmallAction
                    label={editing ? "Save" : "Send"}
                    tone="success"
                    disabled={!canSubmit}
                    onPress={() => void submit()}
                  />
                  {editing ? (
                    <SmallAction
                      label="Delete"
                      tone="danger"
                      disabled={controller.isBusy}
                      onPress={requestDelete}
                    />
                  ) : (
                    <SmallAction
                      label="Refresh"
                      tone="neutral"
                      disabled={controller.loading}
                      onPress={() => void controller.load(true)}
                    />
                  )}
                </View>
              </View>
            </AdminCard>
          </View>
        </View>
      </Modal>
    </View>
  );
}
