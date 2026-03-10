import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { apiRequest } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { useRole } from "@/context/RoleContext";
import { useSocket } from "@/context/SocketContext";
import { VideoPlayer } from "@/components/media/VideoPlayer";

export function PhysioReferralPanel({ discount }: { discount?: string }) {
  const { token } = useAppSelector((state) => state.user);
  const { isDark } = useAppTheme();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [referral, setReferral] = useState<{
    referalLink?: string | null;
    discountPercent?: number | null;
    metadata?: {
      physioName?: string | null;
      clinicName?: string | null;
      location?: string | null;
      phone?: string | null;
      specialty?: string | null;
    } | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ item?: any }>("/physio-referral", { token, suppressLog: true });
      setReferral(data.item ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load referral.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  useEffect(() => {
    if (!socket) return;

    const handleReferralChange = () => {
      void loadReferral();
    };

    socket.on("physio:referral:updated", handleReferralChange);
    socket.on("physio:referral:deleted", handleReferralChange);

    return () => {
      socket.off("physio:referral:updated", handleReferralChange);
      socket.off("physio:referral:deleted", handleReferralChange);
    };
  }, [loadReferral, socket]);

  const resolvedDiscount = referral?.discountPercent
    ? `${referral.discountPercent}%`
    : discount;
  const referralLink = referral?.referalLink ?? null;
  const statusCopy = referralLink
    ? "Your referral is ready. Tap to book your physio session."
    : "A referral link will appear here once your coach activates it.";

  const meta = referral?.metadata ?? {};
  const hasMeta = !!(meta.physioName || meta.location || meta.phone);

  return (
    <View 
      className="rounded-3xl bg-card px-6 py-5"
      style={isDark ? Shadows.none : Shadows.md}
    >
      <Text className="text-lg font-clash text-app font-bold mb-2">Physio Referral</Text>
      <Text className="text-sm font-outfit text-secondary leading-relaxed">
        Access our trusted physio partners for injuries and recovery support.
      </Text>

      {hasMeta && (
        <View className="mt-4 rounded-2xl bg-secondary/10 px-4 py-4 space-y-2">
          {meta.physioName && (
            <Text className="text-sm font-clash font-bold text-app">{meta.physioName}</Text>
          )}
          {meta.clinicName && (
            <Text className="text-xs font-outfit text-secondary">{meta.clinicName}</Text>
          )}
          {meta.location && (
            <View className="flex-row items-center gap-2 mt-1">
              <Feather name="map-pin" size={12} color="#94A3B8" />
              <Text className="text-xs font-outfit text-secondary flex-1">{meta.location}</Text>
            </View>
          )}
          {meta.phone && (
            <View className="flex-row items-center gap-2 mt-1">
              <Feather name="phone" size={12} color="#94A3B8" />
              <Text className="text-xs font-outfit text-secondary">{meta.phone}</Text>
            </View>
          )}
          {meta.specialty && (
            <Text className="text-xs font-outfit text-accent mt-2 font-medium">{meta.specialty}</Text>
          )}
        </View>
      )}

      {resolvedDiscount && (
        <View className="mt-4 rounded-2xl bg-secondary/5 px-4 py-3 flex-row items-center gap-2">
          <Feather name="tag" size={14} color="#2F8F57" />
          <Text className="text-sm font-outfit text-secondary">
            Discount: <Text className="font-bold text-app">{resolvedDiscount}</Text>
          </Text>
        </View>
      )}

      <Text className="text-sm font-outfit text-secondary mt-4">{statusCopy}</Text>
      
      {loading ? (
        <Text className="text-sm font-outfit text-secondary mt-3">Loading referral...</Text>
      ) : error ? (
        <Text className="text-sm font-outfit text-red-400 mt-3">{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={() => {
          if (!referralLink) return;
          Linking.openURL(referralLink).catch(() => null);
        }}
        disabled={!referralLink}
        className={`mt-4 rounded-full px-4 py-3 flex-row justify-center items-center gap-2 ${referralLink ? "bg-accent" : "bg-secondary/20"}`}
      >
        <Text className={`text-sm font-outfit font-bold ${referralLink ? "text-white" : "text-secondary"}`}>
          {referralLink ? "Open Referral Link" : "Referral link not set"}
        </Text>
        {referralLink && <Feather name="external-link" size={16} color="#FFFFFF" />}
      </TouchableOpacity>
    </View>
  );
}

export function ParentEducationPanel({ onOpen }: { onOpen: () => void }) {
  const { isDark } = useAppTheme();
  return (
    <View 
      className="rounded-3xl bg-card px-6 py-5"
      style={isDark ? Shadows.none : Shadows.md}
    >
      <Text className="text-lg font-clash text-app font-bold mb-2">Parent Education Hub</Text>
      <Text className="text-sm font-outfit text-secondary leading-relaxed">
        Explore curated courses on growth, recovery, nutrition, and mindset.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Open Parent Education</Text>
      </TouchableOpacity>
    </View>
  );
}

export function BookingsPanel({ onOpen }: { onOpen: () => void }) {
  const { isDark } = useAppTheme();
  return (
    <View 
      className="rounded-3xl bg-card px-6 py-5"
      style={isDark ? Shadows.none : Shadows.md}
    >
      <Text className="text-lg font-clash text-app font-bold mb-2">Bookings</Text>
      <Text className="text-sm font-outfit text-secondary leading-relaxed">
        Book one-to-one sessions, lift lab visits, or role model meetings.
      </Text>
      <TouchableOpacity onPress={onOpen} className="mt-4 rounded-full bg-accent px-4 py-3">
        <Text className="text-white text-sm font-outfit">Go to Bookings</Text>
      </TouchableOpacity>
    </View>
  );
}

export function FoodDiaryPanel() {
  const { token } = useAppSelector((state) => state.user);
  const { isDark, colors } = useAppTheme();
  const [entry, setEntry] = useState("");
  const [meals, setMeals] = useState({
    breakfast: "",
    lunch: "",
    dinner: "",
    snacks: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoAspectRatio, setPhotoAspectRatio] = useState<number>(4 / 3);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [entries, setEntries] = useState<
    {
      id: number;
      date?: string | null;
      notes?: string | null;
      photoUrl?: string | null;
      meals?: Record<string, string> | null;
      feedback?: string | null;
      reviewedAt?: string | null;
    }[]
  >([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreviewLoading, setPhotoPreviewLoading] = useState(false);
  const [status, setStatus] = useState<{ tone: "error" | "success" | "info"; message: string } | null>(null);
  const previousEntriesRef = useRef<{ id: number; feedback?: string | null }[]>([]);

  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, data?: Record<string, string>) => {
      const Notifications = await getNotifications();
      if (!Notifications || typeof Notifications.scheduleNotificationAsync !== "function") return;
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          data,
        },
        trigger: null,
      });
    },
    []
  );

  const loadEntries = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingEntries(true);
      const data = await apiRequest<{ items: any[] }>("/food-diary", { token, suppressLog: true });
      const items = data.items ?? [];
      setEntries(items);

      const previousById = new Map(previousEntriesRef.current.map((item) => [item.id, item]));
      const newlyReviewed = items.filter(
        (item) => item?.id && item?.feedback && previousById.has(item.id) && !previousById.get(item.id)?.feedback
      );
      if (newlyReviewed.length) {
        await scheduleLocalNotification(
          "Coach responded",
          "Your food diary has new feedback.",
          { type: "food-diary-feedback" }
        );
      }
      previousEntriesRef.current = items.map((item) => ({ id: item.id, feedback: item.feedback ?? null }));
    } catch (error: any) {
      setStatus({ tone: "error", message: error?.message ?? "Failed to load food diary." });
    } finally {
      setLoadingEntries(false);
    }
  }, [token]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const handlePickPhoto = async () => {
    setStatus(null);
    const mediaTypes =
      (ImagePicker as any).MediaType?.Images
        ? [(ImagePicker as any).MediaType.Images]
        : (ImagePicker as any).MediaTypeOptions?.Images;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.7,
    });
    const canceled = (result as any).canceled ?? (result as any).cancelled;
    const uri = result.assets?.[0]?.uri ?? (result as any).uri;
    if (!canceled && uri) {
      setPhotoError(null);
      setPhotoAspectRatio(4 / 3);
      setPhoto(uri);
    }
  };

  const handleTakePhoto = async () => {
    if (!token) return;
    setStatus(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatus({ tone: "info", message: "Camera permission is required to take a photo." });
      return;
    }
    const mediaTypes =
      (ImagePicker as any).MediaType?.Images
        ? [(ImagePicker as any).MediaType.Images]
        : (ImagePicker as any).MediaTypeOptions?.Images;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes,
      quality: 0.7,
    });
    const canceled = (result as any).canceled ?? (result as any).cancelled;
    const uri = result.assets?.[0]?.uri ?? (result as any).uri;
    if (!canceled && uri) {
      setPhotoError(null);
      setPhotoAspectRatio(4 / 3);
      setPhoto(uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!token) return null;
    const fileName = uri.split("/").pop() ?? `food-${Date.now()}.jpg`;
    const contentType = "image/jpeg";
    const blob = await (await fetch(uri)).blob();
    const sizeBytes = blob.size;
    const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
      method: "POST",
      token,
      body: {
        folder: "food-diary",
        fileName,
        contentType,
        sizeBytes,
      },
    });
    await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    return presign.publicUrl;
  };

  const handleSave = async () => {
    const hasContent = entry.trim().length > 0 || Object.values(meals).some((value) => value.trim());
    if (!token) return;
    if (!hasContent) {
      setStatus({ tone: "info", message: "Add a note or at least one meal before saving." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const photoUrl = photo ? (setPhotoUploading(true), await uploadPhoto(photo)) : null;
      const today = entryDate.toISOString().slice(0, 10);
      const payload: Record<string, unknown> = {
        date: today,
        notes: entry.trim(),
        meals: Object.fromEntries(
          Object.entries(meals).filter(([, value]) => value.trim())
        ),
      };
      if (photoUrl) {
        payload.photoUrl = photoUrl;
      }
      await apiRequest("/food-diary", {
        method: "POST",
        token,
        body: payload,
      });
      setEntry("");
      setMeals({ breakfast: "", lunch: "", dinner: "", snacks: "" });
      setPhoto(null);
      await loadEntries();
      setStatus({ tone: "success", message: "Entry saved." });
      await scheduleLocalNotification(
        "Food diary submitted",
        "Your entry has been sent to your coach.",
        { type: "food-diary-submitted" }
      );
    } catch (error: any) {
      setStatus({ tone: "error", message: error?.message ?? "Failed to save entry." });
    } finally {
      setPhotoUploading(false);
      setSaving(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Today";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Today";
    return d.toLocaleDateString();
  };

  const formatMeals = (mealData?: Record<string, string> | null) => {
    if (!mealData) return [];
    return Object.entries(mealData)
      .filter(([, value]) => value && value.trim())
      .map(([key, value]) => ({
        label: key.replace(/^\w/, (c) => c.toUpperCase()),
        value,
      }));
  };

  const filledMealsCount = Object.values(meals).filter((value) => value.trim()).length;
  const reviewedEntriesCount = entries.filter((item) => Boolean(item.feedback)).length;
  const pendingEntriesCount = entries.filter((item) => !item.feedback).length;
  const hasDraft = entry.trim().length > 0 || filledMealsCount > 0;
  const mealPlaceholders: Record<keyof typeof meals, string> = {
    breakfast: "What was eaten, how much, and timing before training if relevant.",
    lunch: "Add key foods, fluids, and anything that affected energy.",
    dinner: "Log the main meal and any recovery focus after training.",
    snacks: "Include shakes, fruit, bars, or small snacks through the day.",
  };

  return (
    <View className="gap-4">
      <View
        className="overflow-hidden rounded-3xl border px-6 py-5"
        style={{
          backgroundColor: isDark ? colors.card : "#F7FFF9",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.md),
        }}
      >
        <View
          className="absolute -right-10 -top-8 h-24 w-24 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.10)" }}
        />
        <View
          className="absolute -bottom-10 left-10 h-24 w-24 rounded-full"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" }}
        />

        <View className="mb-5">
          <View className="self-start rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.82)" }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.3px]" style={{ color: colors.accent }}>
              Guardian check-in
            </Text>
          </View>
          <Text className="mt-3 text-2xl font-clash text-app font-bold">Submit Diary</Text>
          <Text className="mt-2 text-sm font-outfit text-secondary leading-6">
            Log meals, add recovery context, and give your coach a clearer picture of fuelling habits across the week.
          </Text>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">Draft meals</Text>
            <Text className="font-clash text-2xl text-app">{filledMealsCount}</Text>
            <Text className="text-sm font-outfit text-secondary mt-1">Meal sections filled in this entry</Text>
          </View>
          <View className="flex-1 rounded-[22px] px-4 py-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.84)" }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">Coach replies</Text>
            <Text className="font-clash text-2xl text-app">{reviewedEntriesCount}</Text>
            <Text className="text-sm font-outfit text-secondary mt-1">Entries with feedback received</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setDatePickerOpen(true)}
          className="mt-5 flex-row items-center justify-between rounded-2xl border px-4 py-3"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          }}
        >
          <View>
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
              Entry Date
            </Text>
            <Text className="mt-1 text-sm font-outfit text-app">{entryDate.toLocaleDateString()}</Text>
          </View>
          <Feather name="calendar" size={18} color={colors.accent} />
        </TouchableOpacity>
        {datePickerOpen ? (
          <DateTimePicker
            value={entryDate}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setDatePickerOpen(false);
              if (selected) {
                setEntryDate(selected);
              }
            }}
          />
        ) : null}
        <View className="mt-5 rounded-[24px] border p-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)" }}>
          <View className="mb-3 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : colors.accentLight }}>
              <Feather name="edit-3" size={18} color={colors.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold font-outfit text-app">Daily notes</Text>
              <Text className="text-xs font-outfit text-secondary mt-1">Add appetite, hydration, recovery, or anything that affected fuelling.</Text>
            </View>
            <Text className="text-sm font-outfit text-secondary">{entry.trim().length}/500</Text>
          </View>
          <TextInput
            value={entry}
            onChangeText={setEntry}
            placeholder="How did fuelling go today? Include appetite, hydration, energy, or what felt different."
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={500}
            className="rounded-2xl px-4 py-3 text-sm font-outfit text-app"
            style={{ minHeight: 100, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.86)" }}
          />
        </View>

        <View className="mt-4 gap-3">
          {(["breakfast", "lunch", "dinner", "snacks"] as const).map((meal) => (
            <View
              key={meal}
              className="rounded-[24px] border px-4 py-4"
              style={{
                backgroundColor: colors.card,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                ...(isDark ? Shadows.none : Shadows.sm),
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}>
                    <Feather
                      name={meal === "breakfast" ? "sunrise" : meal === "lunch" ? "sun" : meal === "dinner" ? "moon" : "coffee"}
                      size={17}
                      color={colors.accent}
                    />
                  </View>
                  <View>
                    <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                      {meal}
                    </Text>
                    <Text className="text-sm font-outfit text-app mt-0.5">
                      {meals[meal].trim() ? "Added" : "Optional"}
                    </Text>
                  </View>
                </View>
                {meals[meal].trim() ? (
                  <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.10)" }}>
                    <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.accent }}>
                      logged
                    </Text>
                  </View>
                ) : null}
              </View>
              <TextInput
                value={meals[meal]}
                onChangeText={(value) => setMeals((prev) => ({ ...prev, [meal]: value }))}
                placeholder={mealPlaceholders[meal]}
                placeholderTextColor={colors.placeholder}
                multiline
                className="mt-3 rounded-2xl px-4 py-3 text-sm font-outfit text-app"
                style={{ minHeight: 72, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)" }}
              />
            </View>
          ))}
        </View>

        <View className="mt-4 rounded-[24px] border px-4 py-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", backgroundColor: colors.card, ...(isDark ? Shadows.none : Shadows.sm) }}>
          <View className="flex-row items-center justify-between gap-3 mb-3">
            <View>
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Photo Preview
              </Text>
              <Text className="text-sm font-outfit text-app mt-1">
                Optional meal photo for extra context.
              </Text>
            </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.textSecondary }}>
                {photo ? "Attached" : "Optional"}
              </Text>
            </View>
          </View>
          {photo ? (
            <View className="mt-2">
              <Image
                source={{ uri: photo }}
                className="w-full rounded-2xl"
                resizeMode="cover"
                style={{ width: "100%", height: undefined, aspectRatio: photoAspectRatio }}
                onLoadStart={() => setPhotoPreviewLoading(true)}
                onLoad={(event) => {
                  const width = event?.nativeEvent?.source?.width;
                  const height = event?.nativeEvent?.source?.height;
                  if (width && height) {
                    setPhotoAspectRatio(width / height);
                  }
                }}
                onLoadEnd={() => setPhotoPreviewLoading(false)}
                onError={(event) => {
                  const message = event?.nativeEvent?.error
                    ? String(event.nativeEvent.error)
                    : "Failed to load preview.";
                  setPhotoError(message);
                }}
              />
              {photoPreviewLoading ? (
                <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/25">
                  <ActivityIndicator color="#FFFFFF" />
                  <Text className="mt-2 text-xs font-outfit text-white">Loading preview...</Text>
                </View>
              ) : null}
              {photoUploading ? (
                <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/35">
                  <ActivityIndicator color="#FFFFFF" />
                  <Text className="mt-2 text-xs font-outfit text-white">Uploading photo...</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text className="mt-2 text-sm font-outfit text-secondary">No photo selected.</Text>
          )}
          {photoError ? (
            <Text className="mt-2 text-xs font-outfit text-red-300">{photoError}</Text>
          ) : null}
        </View>

        <View className="mt-4 gap-3">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handlePickPhoto}
              className="flex-1 rounded-2xl px-4 py-3"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
            >
              <Text className="text-app text-sm font-outfit text-center">
                {photo ? "Change Photo" : "Add Photo"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTakePhoto}
              className="flex-1 rounded-2xl px-4 py-3"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
            >
              <Text className="text-app text-sm font-outfit text-center">Take Photo</Text>
            </TouchableOpacity>
            {photo ? (
              <TouchableOpacity
                onPress={() => setPhoto(null)}
                className="rounded-2xl px-4 py-3"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
              >
                <Text className="text-app text-sm font-outfit text-center">Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="rounded-[24px] border p-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)" }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Ready to send
              </Text>
              <Text className="text-xs font-outfit text-secondary">
                {hasDraft ? "Draft in progress" : "Add details to start"}
              </Text>
            </View>
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.84)" }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px] text-secondary">Meals</Text>
                <Text className="font-clash text-xl text-app mt-1">{filledMealsCount}/4</Text>
              </View>
              <View className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.84)" }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px] text-secondary">Photo</Text>
                <Text className="font-clash text-xl text-app mt-1">{photo ? "Yes" : "No"}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !hasDraft}
              className={`rounded-2xl px-4 py-4 ${saving || !hasDraft ? "bg-accent/40" : "bg-accent"}`}
            >
              <Text
                className={`text-center text-sm font-outfit font-bold ${saving || !hasDraft ? "text-white/90" : "text-white"}`}
              >
                {saving ? "Saving..." : "Save Entry"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {status ? (
          <View
            className={`mt-3 rounded-2xl border px-4 py-3 ${
              status.tone === "error"
                ? "border-red-400/40 bg-red-500/10"
                : status.tone === "success"
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-app/20 bg-white/5"
            }`}
          >
            <Text
              className={`text-sm font-outfit ${
                status.tone === "error"
                  ? "text-red-200"
                  : status.tone === "success"
                    ? "text-emerald-200"
                    : "text-secondary"
              }`}
            >
              {status.message}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">Recent Entries</Text>
        <TouchableOpacity onPress={loadEntries}>
          <Text className="text-sm font-outfit text-accent">Refresh</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 rounded-[22px] border px-4 py-4" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? Shadows.none : Shadows.sm) }}>
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">Awaiting review</Text>
          <Text className="font-clash text-2xl text-app">{pendingEntriesCount}</Text>
        </View>
        <View className="flex-1 rounded-[22px] border px-4 py-4" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? Shadows.none : Shadows.sm) }}>
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">Reviewed</Text>
          <Text className="font-clash text-2xl text-app">{reviewedEntriesCount}</Text>
        </View>
      </View>

      {loadingEntries ? (
        <Text className="text-sm font-outfit text-secondary">Loading entries...</Text>
      ) : entries.length ? (
        <View className="gap-3">
          {entries.map((item) => (
            <View 
              key={item.id} 
              className="rounded-3xl bg-card px-5 py-4"
              style={isDark ? Shadows.none : Shadows.sm}
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">
                  {formatDate(item.date)}
                </Text>
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: item.feedback ? (isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.10)") : (isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)") }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: item.feedback ? colors.accent : colors.textSecondary }}>
                    {item.feedback ? "Reviewed" : "Pending"}
                  </Text>
                </View>
              </View>
              {formatMeals(item.meals).length ? (
                <View className="mt-2 gap-2">
                  {formatMeals(item.meals).map((meal) => (
                    <View key={meal.label}>
                      <Text className="text-[10px] font-outfit text-secondary uppercase tracking-[1.2px]">
                        {meal.label}
                      </Text>
                      <Text className="text-sm font-outfit text-app mt-1">{meal.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {item.notes ? <Text className="text-sm font-outfit text-app mt-2">{item.notes}</Text> : null}
              {item.feedback ? (
                <View className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                  <Text className="text-[10px] font-outfit text-emerald-300 uppercase tracking-[1.2px]">
                    Coach Response
                  </Text>
                  <Text className="text-sm font-outfit text-app mt-1">{item.feedback}</Text>
                  {item.reviewedAt ? (
                    <Text className="text-xs font-outfit text-secondary mt-2">
                      {new Date(item.reviewedAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} className="mt-3 h-24 w-full rounded-2xl" resizeMode="cover" />
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-sm font-outfit text-secondary">No entries yet.</Text>
      )}
    </View>
  );
}

export function VideoUploadPanel({ refreshToken = 0 }: { refreshToken?: number }) {
  const { token, profile, athleteUserId } = useAppSelector((state) => state.user);
  const { role } = useRole();
  const { isDark, colors } = useAppTheme();
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [videoItems, setVideoItems] = useState<
    { id: number; videoUrl: string; notes?: string | null; createdAt?: string | null; feedback?: string | null }[]
  >([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [coachResponses, setCoachResponses] = useState<
    { id: string; mediaUrl: string; text?: string; createdAt?: string | null; videoUploadId?: number }[]
  >([]);
  const previousVideoItemsRef = useRef<{ id: number; feedback?: string | null }[]>([]);
  const previousCoachResponsesRef = useRef<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  } | null>(null);

  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, data?: Record<string, string>) => {
      const Notifications = await getNotifications();
      if (!Notifications || typeof Notifications.scheduleNotificationAsync !== "function") return;
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          data,
        },
        trigger: null,
      });
    },
    []
  );

  const loadVideos = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    try {
      setLoadingVideos(true);
      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const data = await apiRequest<{ items: { id: number; videoUrl: string; notes?: string | null; createdAt?: string | null; feedback?: string | null }[] }>(
        "/videos",
        { token, headers, suppressLog: true, forceRefresh }
      );
      const items = data.items ?? [];
      setVideoItems(items);

      const previousById = new Map(previousVideoItemsRef.current.map((item) => [item.id, item]));
      const newlyReviewed = items.filter(
        (item) => item?.id && item?.feedback && previousById.has(item.id) && !previousById.get(item.id)?.feedback
      );
      if (newlyReviewed.length) {
        await scheduleLocalNotification(
          "Coach feedback",
          "Your video review has new feedback.",
          { type: "video-feedback" }
        );
      }
      previousVideoItemsRef.current = items.map((item) => ({ id: item.id, feedback: item.feedback ?? null }));
    } catch {
      // keep upload flow resilient if history fetch fails
    } finally {
      setLoadingVideos(false);
    }
  }, [athleteUserId, scheduleLocalNotification, token]);

  const loadCoachResponses = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    try {
      setLoadingResponses(true);
      const effectiveUserId = athleteUserId ? Number(athleteUserId) : Number(profile.id);
      const headers = athleteUserId ? { "X-Acting-User-Id": String(athleteUserId) } : undefined;
      const data = await apiRequest<{ messages: any[] }>("/messages", {
        token,
        headers,
        suppressLog: true,
        forceRefresh,
      });
      const items = (data.messages ?? [])
        .filter(
          (msg: any) =>
            msg.contentType === "video" &&
            msg.mediaUrl &&
            Number(msg.senderId) !== effectiveUserId &&
            Number.isFinite(msg.videoUploadId)
        )
        .map((msg: any) => ({
          id: String(msg.id),
          mediaUrl: msg.mediaUrl,
          text: msg.content,
          createdAt: msg.createdAt ?? null,
          videoUploadId: msg.videoUploadId ?? undefined,
        }));
      setCoachResponses(items);

      const previousIds = new Set(previousCoachResponsesRef.current);
      const newItems = items.filter((item) => item?.id && !previousIds.has(item.id));
      if (newItems.length) {
        await scheduleLocalNotification(
          "Coach response video",
          "Your coach sent a response video.",
          { type: "coach-response-video" }
        );
      }
      previousCoachResponsesRef.current = items.map((item) => item.id);
    } catch {
      // avoid blocking the main upload flow if messages fail
    } finally {
      setLoadingResponses(false);
    }
  }, [athleteUserId, profile.id, role, scheduleLocalNotification, token]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleVideoReviewed = (updatedUpload: any) => {
      setVideoItems((prev) => 
        prev.map((item) => item.id === updatedUpload.id ? { ...item, ...updatedUpload } : item)
      );
    };

    socket.on("video:reviewed", handleVideoReviewed);
    return () => {
      socket.off("video:reviewed", handleVideoReviewed);
    };
  }, [socket]);

  useEffect(() => {
    void loadVideos();
    void loadCoachResponses();
  }, [loadCoachResponses, loadVideos, refreshToken]);

  const awaitingVideos = videoItems.filter((item) => !item.feedback);
  const reviewedVideos = videoItems.filter((item) => Boolean(item.feedback));
  const responsesByUpload = coachResponses.reduce<Record<number, typeof coachResponses>>((acc, item) => {
    if (!item.videoUploadId) return acc;
    if (!acc[item.videoUploadId]) acc[item.videoUploadId] = [];
    acc[item.videoUploadId].push(item);
    return acc;
  }, {});
  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  };
  const formatBytes = (value: number) => {
    if (!value) return "0 MB";
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(value >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  };

  const pickVideo = async (source: "library" | "camera") => {
    if (!token) return;
    setStatus(null);
    const mediaTypes =
      (ImagePicker as any).MediaType?.Videos
        ? [(ImagePicker as any).MediaType.Videos]
        : (ImagePicker as any).MediaTypeOptions?.Videos;
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setStatus("Camera permission is required to record video.");
          return;
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setStatus("Media library permission is required to upload video.");
          return;
        }
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes,
              quality: 0.9,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes,
              quality: 0.9,
              allowsEditing: false,
            });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = uri.split("/").pop() ?? `upload-${Date.now()}.mp4`;
      const contentType = asset.mimeType || "video/mp4";
      const maxSizeBytes = 200 * 1024 * 1024;

      const blob = await (await fetch(uri)).blob();
      const sizeBytes = blob.size;
      if (!sizeBytes || sizeBytes > maxSizeBytes) {
        throw new Error("Video exceeds 200MB limit.");
      }
      setSelectedVideo({ uri, fileName, contentType, sizeBytes });
      setStatus("Preview your video and confirm before sending.");
    } catch (error: any) {
      setStatus(error?.message ?? "Upload failed.");
    }
  };

  const handlePickVideo = async () => {
    await pickVideo("library");
  };

  const handleRecordVideo = async () => {
    await pickVideo("camera");
  };

  const handleSubmitVideo = async () => {
    if (!token || !selectedVideo) return;
    Alert.alert(
      "Confirm Send",
      "Send this video and notes to your coach for review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              setUploading(true);
              setStatus(null);
              const blob = await (await fetch(selectedVideo.uri)).blob();

              const presign = await apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
                method: "POST",
                token,
                body: {
                  folder: "video-uploads",
                  fileName: selectedVideo.fileName,
                  contentType: selectedVideo.contentType,
                  sizeBytes: selectedVideo.sizeBytes,
                },
              });
              const uploadRes = await fetch(presign.uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": selectedVideo.contentType },
                body: blob,
              });
              if (!uploadRes.ok) throw new Error("Upload failed");

              await apiRequest("/videos", {
                method: "POST",
                token,
                body: { videoUrl: presign.publicUrl, notes: notes.trim() || undefined },
              });
              await scheduleLocalNotification(
                "Video uploaded",
                "Your video was submitted for coach review.",
                { type: "video-upload" }
              );
              setStatus("Video submitted for coach review.");
              setNotes("");
              setSelectedVideo(null);
              await loadVideos();
            } catch (error: any) {
              setStatus(error?.message ?? "Upload failed.");
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View 
      className="rounded-3xl bg-card px-5 py-5"
      style={isDark ? Shadows.none : Shadows.md}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-clash text-app font-bold">Video Upload</Text>
        <View className="rounded-full border border-app/20 bg-white/10 px-3 py-1">
          <Text className="text-xs font-outfit text-secondary uppercase tracking-[1px]">Coach Review</Text>
        </View>
      </View>
      <Text className="text-sm font-outfit text-secondary mt-2 leading-6">
        Share one focused training clip, explain what you want reviewed, and keep all coach feedback in one place.
      </Text>

      <View className="mt-4 rounded-[24px] border p-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)" }}>
        <View className="mb-3 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.12)" : colors.accentLight }}>
            <Feather name="target" size={18} color={colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold font-outfit text-app">Best results come from one clear focus</Text>
            <Text className="text-xs font-outfit text-secondary mt-1">Example: squat depth, sprint start, landing mechanics, or a single drill.</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {[
            "Full movement in frame",
            "Good light",
            "One coaching question",
            "Under 200MB",
          ].map((tip) => (
            <View
              key={tip}
              className="rounded-full border px-3 py-2"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              }}
            >
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.textSecondary }}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="What do you want your coach to assess? Mention the athlete, drill, or exact movement issue."
        placeholderTextColor={colors.placeholder}
        multiline
        className="mt-4 rounded-2xl border border-app/15 bg-white/10 px-4 py-3 text-sm font-outfit text-app"
        style={{ minHeight: 88 }}
      />
      {selectedVideo ? (
        <View className="mt-4 rounded-[24px] border p-3" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.24)" }}>
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <View>
              <Text className="text-sm font-outfit text-app mb-1">Preview before send</Text>
              <Text className="text-xs font-outfit text-secondary">Check framing and confirm the right clip is selected.</Text>
            </View>
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.8)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.accent }}>
                Ready
              </Text>
            </View>
          </View>
          <VideoPlayer uri={selectedVideo.uri} height={180} />
          <View className="mt-3 flex-row flex-wrap gap-2">
            <View className="rounded-full border px-3 py-2" style={{ borderColor: "rgba(34,197,94,0.24)", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.textSecondary }}>
                {formatBytes(selectedVideo.sizeBytes)}
              </Text>
            </View>
            <View className="rounded-full border px-3 py-2" style={{ borderColor: "rgba(34,197,94,0.24)", backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)" }}>
              <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.1px]" style={{ color: colors.textSecondary }}>
                {selectedVideo.contentType.replace("video/", "")}
              </Text>
            </View>
          </View>
          <Text className="text-sm font-outfit text-secondary mt-3" numberOfLines={1}>
            {selectedVideo.fileName}
          </Text>
        </View>
      ) : null}
      {status ? (
        <View className={`mt-3 rounded-xl border px-3 py-2 ${status.toLowerCase().includes("submitted") ? "border-emerald-400/40 bg-emerald-400/10" : "border-app/20 bg-white/10"}`}>
          <Text className="text-sm font-outfit text-secondary">{status}</Text>
        </View>
      ) : null}
      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleRecordVideo}
          disabled={uploading}
          className="flex-1 rounded-2xl px-4 py-3 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
        >
          <Feather name="video" size={16} color={colors.text} />
          <Text className="text-app text-sm font-outfit">Record Video</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePickVideo}
          disabled={uploading}
          className="flex-1 rounded-2xl px-4 py-3 flex-row items-center justify-center gap-2"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)" }}
        >
          <Feather name="upload" size={16} color={colors.text} />
          <Text className="text-app text-sm font-outfit">Upload Video</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={handleSubmitVideo}
        disabled={uploading || !selectedVideo}
        className={`mt-3 rounded-2xl px-4 py-3 flex-row items-center justify-center gap-2 ${uploading || !selectedVideo ? "bg-accent/40" : "bg-accent"}`}
      >
        <Feather name="send" size={16} color="white" />
        <Text className="text-white text-sm font-outfit">{uploading ? "Uploading..." : "Send to Coach"}</Text>
      </TouchableOpacity>

      <View 
        className="mt-6 rounded-2xl bg-card p-4"
        style={isDark ? Shadows.none : Shadows.sm}
      >
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-lg font-clash text-app font-bold">Your Uploaded Videos</Text>
          <TouchableOpacity
            onPress={() => void loadVideos(true)}
            disabled={loadingVideos}
            className="rounded-full border border-app/20 bg-white/10 px-3 py-1.5"
          >
            <Text className="text-xs font-outfit text-app">{loadingVideos ? "Refreshing..." : "Refresh"}</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-sm font-outfit text-secondary mb-3 leading-6">
          Track what is awaiting review, what already has feedback, and any response videos sent back by your coach.
        </Text>
        <ScrollView
          style={{ maxHeight: 520 }}
          nestedScrollEnabled
          alwaysBounceVertical
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={loadingVideos || loadingResponses}
              onRefresh={() => {
                void loadVideos(true);
                void loadCoachResponses(true);
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loadingVideos && videoItems.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">Loading uploads...</Text>
          ) : videoItems.length === 0 ? (
            <Text className="text-sm font-outfit text-secondary">No videos uploaded yet.</Text>
          ) : (
            <View className="gap-5">
              <View className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-clash text-app font-bold">Awaiting Review</Text>
                  <View className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-app">{awaitingVideos.length}</Text>
                  </View>
                </View>
                {awaitingVideos.length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary">No pending videos.</Text>
                ) : (
                  <View className="gap-4">
                    {awaitingVideos.map((item) => (
                      <View 
                        key={`awaiting-${item.id}`} 
                        className="rounded-2xl bg-card p-3"
                        style={isDark ? Shadows.none : Shadows.sm}
                      >
                        <VideoPlayer uri={item.videoUrl} height={170} />
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-xs font-outfit text-secondary">Upload #{item.id}</Text>
                          {formatDate(item.createdAt) ? (
                            <Text className="text-xs font-outfit text-secondary">{formatDate(item.createdAt)}</Text>
                          ) : null}
                        </View>
                        {item.notes ? (
                          <Text className="text-sm font-outfit text-secondary mt-2">Notes: {item.notes}</Text>
                        ) : null}
                        {responsesByUpload[item.id]?.length ? (
                          <View className="mt-3 gap-3">
                            <Text className="text-xs font-outfit text-secondary">Coach response video</Text>
                            {responsesByUpload[item.id]
                              .slice()
                              .sort((a, b) => {
                                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                return bTime - aTime;
                              })
                              .map((response) => (
                                <View key={`awaiting-response-${item.id}-${response.id}`} className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-2">
                                  <VideoPlayer uri={response.mediaUrl} height={160} />
                                  {response.text ? (
                                    <Text className="text-xs font-outfit text-secondary mt-2">{response.text}</Text>
                                  ) : null}
                                </View>
                              ))}
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-clash text-app font-bold">Reviewed With Coach Feedback</Text>
                  <View className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1">
                    <Text className="text-xs font-outfit text-app">{reviewedVideos.length}</Text>
                  </View>
                </View>
                {reviewedVideos.length === 0 ? (
                  <Text className="text-sm font-outfit text-secondary">No reviewed videos yet.</Text>
                ) : (
                  <View className="gap-4">
                    {reviewedVideos.map((item) => (
                      <View 
                        key={`reviewed-${item.id}`} 
                        className="rounded-2xl bg-card p-3"
                        style={isDark ? Shadows.none : Shadows.sm}
                      >
                        <VideoPlayer uri={item.videoUrl} height={170} />
                        <View className="mt-2 flex-row items-center justify-between">
                          <Text className="text-xs font-outfit text-secondary">Upload #{item.id}</Text>
                          {formatDate(item.createdAt) ? (
                            <Text className="text-xs font-outfit text-secondary">{formatDate(item.createdAt)}</Text>
                          ) : null}
                        </View>
                        {item.notes ? (
                          <Text className="text-sm font-outfit text-secondary mt-2">Notes: {item.notes}</Text>
                        ) : null}
                        <View className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                          <Text className="text-sm font-clash text-app">Coach feedback</Text>
                          <Text className="text-sm font-outfit text-secondary mt-1">{item.feedback}</Text>
                        </View>
                        {responsesByUpload[item.id]?.length ? (
                          <View className="mt-3 gap-3">
                            <Text className="text-xs font-outfit text-secondary">Coach response video</Text>
                            {responsesByUpload[item.id]
                              .slice()
                              .sort((a, b) => {
                                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                return bTime - aTime;
                              })
                              .map((response) => (
                                <View key={`reviewed-response-${item.id}-${response.id}`} className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-2">
                                  <VideoPlayer uri={response.mediaUrl} height={160} />
                                  {response.text ? (
                                    <Text className="text-xs font-outfit text-secondary mt-2">{response.text}</Text>
                                  ) : null}
                                </View>
                              ))}
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
