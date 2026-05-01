import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Megaphone, Users2, Clock, Search, Plus, Trash2, RefreshCw, Send, Pencil } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Chip } from "@/components/admin/AdminShared";
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

  const accent = colors.accent;
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const sectionBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)";

  return (
    <View style={{ gap: 16, paddingHorizontal: 20 }}>
      {/* Search + New */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: inputBg,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Search size={15} color={colors.textSecondary} />
          <TextInput
            style={{ flex: 1, fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textPrimary, padding: 0 }}
            value={query}
            onChangeText={setQuery}
            placeholder="Search announcements…"
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => ({
            height: 44,
            paddingHorizontal: 16,
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: isDark ? `${accent}18` : `${accent}12`,
            borderWidth: 1,
            borderColor: isDark ? `${accent}30` : `${accent}22`,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Plus size={15} color={accent} />
          <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: accent }}>New</Text>
        </Pressable>
      </View>

      {/* List */}
      {controller.loading && controller.items.length === 0 ? (
        <View style={{ gap: 10 }}>
          <Skeleton width="100%" height={76} />
          <Skeleton width="100%" height={76} />
        </View>
      ) : controller.error ? (
        <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: colors.danger }}>
          {controller.error}
        </Text>
      ) : filtered.length === 0 ? (
        <Text style={{ fontSize: 13, fontFamily: "Outfit-Regular", color: colors.textSecondary }}>
          No announcements found.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((item) => {
            const starts = item.announcementStartsAt ?? item.startsAt ?? null;
            const ends = item.announcementEndsAt ?? item.endsAt ?? null;
            return (
              <Pressable
                key={String(item.id)}
                onPress={() => openEdit(item)}
                style={({ pressed }) => ({
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: border,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
                  padding: 16,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: item.isActive
                        ? isDark ? `${accent}1A` : `${accent}12`
                        : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
                    }}
                  >
                    <Megaphone
                      size={16}
                      color={item.isActive ? accent : colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text
                        numberOfLines={1}
                        style={{ flex: 1, fontFamily: "Outfit-Bold", fontSize: 14, color: colors.textPrimary }}
                      >
                        {String(item.title ?? "Announcement")}
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: item.isActive
                            ? isDark ? `${accent}30` : `${accent}22`
                            : border,
                          backgroundColor: item.isActive
                            ? isDark ? `${accent}14` : `${accent}0C`
                            : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: "Outfit-Bold",
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            color: item.isActive ? accent : colors.textSecondary,
                          }}
                        >
                          {item.isActive ? "Live" : "Draft"}
                        </Text>
                      </View>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 11, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginTop: 2 }}
                    >
                      {formatSchedule(starts, ends)}
                    </Text>
                    {item.body ? (
                      <Text
                        numberOfLines={2}
                        style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: colors.textSecondary, marginTop: 6, lineHeight: 17 }}
                      >
                        {String(item.body)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Editor Modal */}
      <Modal
        visible={editorOpen}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setEditorOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Modal header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "ios" ? 20 : 40,
              paddingBottom: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: border,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? `${accent}18` : `${accent}12`,
              }}
            >
              {editing ? (
                <Pencil size={18} color={accent} />
              ) : (
                <Megaphone size={18} color={accent} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: colors.textPrimary }}>
                {editing ? "Edit Announcement" : "New Announcement"}
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                {editing ? `ID #${String(editing.id)}` : "Broadcast to your community"}
              </Text>
            </View>
            <Pressable
              onPress={() => setEditorOpen(false)}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: inputBg,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontFamily: "Outfit-Medium", fontSize: 13, color: colors.textSecondary }}>
                Cancel
              </Text>
            </Pressable>
          </View>

          {/* Scrollable form */}
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Content section */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: sectionBg,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: border,
                }}
              >
                <Megaphone size={14} color={accent} />
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: accent }}>
                  Content
                </Text>
              </View>

              <View style={{ padding: 16, gap: 12 }}>
                {/* Title */}
                <View>
                  <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                    Title
                  </Text>
                  <View
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={title}
                      onChangeText={(t) => setTitle(t.slice(0, 120))}
                      placeholder="Short, clear subject line"
                      placeholderTextColor={colors.placeholder}
                      style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: colors.textPrimary, padding: 0 }}
                      returnKeyType="next"
                      maxLength={120}
                    />
                  </View>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary, textAlign: "right", marginTop: 4 }}>
                    {title.length}/120
                  </Text>
                </View>

                {/* Body */}
                <View>
                  <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                    Message
                  </Text>
                  <View
                    style={{
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
                      paddingHorizontal: 14,
                      paddingTop: 12,
                      paddingBottom: 8,
                      minHeight: 130,
                    }}
                  >
                    <TextInput
                      value={body}
                      onChangeText={(t) => setBody(t.slice(0, 1000))}
                      placeholder="What do you want to announce?"
                      placeholderTextColor={colors.placeholder}
                      style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textPrimary, padding: 0, lineHeight: 21, flex: 1 }}
                      multiline
                      textAlignVertical="top"
                      maxLength={1000}
                    />
                  </View>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: colors.textSecondary, textAlign: "right", marginTop: 4 }}>
                    {body.length}/1000
                  </Text>
                </View>
              </View>
            </View>

            {/* Audience section */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: sectionBg,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: border,
                }}
              >
                <Users2 size={14} color={accent} />
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: accent }}>
                  Audience
                </Text>
              </View>

              <View style={{ padding: 16, gap: 10 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {audienceTabs.map((tab) => (
                    <Chip
                      key={tab.key}
                      label={tab.label}
                      selected={audienceType === tab.key}
                      onPress={() => setAudienceType(tab.key)}
                    />
                  ))}
                </View>

                {audienceType === "athlete_type" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    <Chip label="Youth" selected={athleteType === "youth"} onPress={() => setAthleteType("youth")} />
                    <Chip label="Adult" selected={athleteType === "adult"} onPress={() => setAthleteType("adult")} />
                  </View>
                )}

                {audienceType === "team" && (
                  <View
                    style={{
                      marginTop: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: border,
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <TextInput
                      value={team}
                      onChangeText={setTeam}
                      placeholder="Exact team name"
                      placeholderTextColor={colors.placeholder}
                      style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: colors.textPrimary, padding: 0 }}
                    />
                  </View>
                )}

                {audienceType === "tier" && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {tierOptions.map((t) => (
                      <Chip
                        key={t}
                        label={t.replaceAll("_", " ")}
                        selected={tier === t}
                        onPress={() => setTier(t)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Timing section */}
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: sectionBg,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: border,
                }}
              >
                <Clock size={14} color={accent} />
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: accent }}>
                  Timing
                </Text>
              </View>

              <View style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Chip label="Permanent" selected={timingType === "permanent"} onPress={() => setTimingType("permanent")} />
                  <Chip label="Scheduled" selected={timingType === "scheduled"} onPress={() => setTimingType("scheduled")} />
                </View>

                {timingType === "scheduled" && (
                  <View style={{ gap: 10 }}>
                    <View
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: border,
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)",
                        padding: 14,
                      }}
                    >
                      <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                        Starts
                      </Text>
                      <DateTimePicker
                        value={startsAt}
                        mode="datetime"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_, date) => { if (date) setStartsAt(date); }}
                        themeVariant={isDark ? "dark" : "light"}
                      />
                    </View>
                    <View
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: border,
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)",
                        padding: 14,
                      }}
                    >
                      <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                        Ends
                      </Text>
                      <DateTimePicker
                        value={endsAt}
                        mode="datetime"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_, date) => { if (date) setEndsAt(date); }}
                        themeVariant={isDark ? "dark" : "light"}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Sticky action bar */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Platform.OS === "ios" ? 32 : 20,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: border,
              gap: 10,
            }}
          >
            <Pressable
              onPress={() => void submit()}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: canSubmit
                  ? isDark ? `${accent}22` : `${accent}16`
                  : isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
                borderWidth: 1,
                borderColor: canSubmit
                  ? isDark ? `${accent}38` : `${accent}28`
                  : border,
                opacity: !canSubmit ? 0.5 : pressed ? 0.75 : 1,
              })}
            >
              <Send size={16} color={canSubmit ? accent : colors.textSecondary} />
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 15,
                  color: canSubmit ? accent : colors.textSecondary,
                }}
              >
                {editing ? "Save Changes" : "Publish Announcement"}
              </Text>
            </Pressable>

            {editing ? (
              <Pressable
                onPress={requestDelete}
                disabled={controller.isBusy}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: isDark ? `${colors.danger}12` : `${colors.danger}08`,
                  borderWidth: 1,
                  borderColor: isDark ? `${colors.danger}28` : `${colors.danger}18`,
                  opacity: controller.isBusy ? 0.4 : pressed ? 0.7 : 1,
                })}
              >
                <Trash2 size={14} color={colors.danger} />
                <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: colors.danger }}>
                  Delete Announcement
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void controller.load(true)}
                disabled={controller.loading}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: inputBg,
                  borderWidth: 1,
                  borderColor: border,
                  opacity: controller.loading ? 0.4 : pressed ? 0.7 : 1,
                })}
              >
                <RefreshCw size={14} color={colors.textSecondary} />
                <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: colors.textSecondary }}>
                  Refresh List
                </Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
