import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

import { apiRequest } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { Text, TextInput } from "@/components/ScaledText";
import { useProgramPanel } from "./shared/useProgramPanel";
import { ProgramPanelCard } from "./shared/ProgramPanelCard";
import { ProgramPanelStatusBadge } from "./shared/ProgramPanelStatusBadge";

export function FoodDiaryPanel() {
  const router = useRouter();
  const { token } = useAppSelector((state) => state.user);
  const { isDark, colors, shadows, scheduleLocalNotification, formatDate } = useProgramPanel();
  
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

  const loadEntries = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingEntries(true);
      const data = await apiRequest<{ items: any[] }>("/food-diary", {
        token,
        suppressLog: true,
        forceRefresh: true,
      });
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
  }, [token, scheduleLocalNotification]);

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
  const reviewedEntriesCount = entries.filter((item) => Boolean(item.reviewedAt)).length;
  const pendingEntriesCount = entries.filter((item) => !item.reviewedAt).length;
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
          ...(isDark ? shadows.none : shadows.md),
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
          <ProgramPanelStatusBadge
            label="Guardian check-in"
            variant="accent"
            className="self-start"
          />
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
                ...(isDark ? shadows.none : shadows.sm),
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
                  <ProgramPanelStatusBadge label="logged" variant="success" />
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

        <View className="mt-4 rounded-[24px] border px-4 py-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", backgroundColor: colors.card, ...(isDark ? shadows.none : shadows.sm) }}>
          <View className="flex-row items-center justify-between gap-3 mb-3">
            <View>
              <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
                Photo Preview
              </Text>
              <Text className="text-sm font-outfit text-app mt-1">
                Optional meal photo for extra context.
              </Text>
            </View>
            <ProgramPanelStatusBadge
              label={photo ? "Attached" : "Optional"}
              variant={photo ? "info" : "default"}
            />
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
        <View className="flex-1 rounded-[22px] border px-4 py-4" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? shadows.none : shadows.sm) }}>
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">Awaiting review</Text>
          <Text className="font-clash text-2xl text-app">{pendingEntriesCount}</Text>
        </View>
        <View className="flex-1 rounded-[22px] border px-4 py-4" style={{ backgroundColor: colors.card, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)", ...(isDark ? shadows.none : shadows.sm) }}>
          <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px] text-secondary mb-2">Reviewed</Text>
          <Text className="font-clash text-2xl text-app">{reviewedEntriesCount}</Text>
        </View>
      </View>

      {loadingEntries ? (
        <Text className="text-sm font-outfit text-secondary">Loading entries...</Text>
      ) : entries.length ? (
        <View className="gap-3">
          {entries.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/food-diary/entry/${item.id}`)}
            >
              <ProgramPanelCard className="px-5 py-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.4px]">
                  {formatDate(item.date)}
                </Text>
                <ProgramPanelStatusBadge
                  label={item.reviewedAt ? "Reviewed" : "Pending"}
                  variant={item.reviewedAt ? "success" : "default"}
                />
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
              </ProgramPanelCard>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text className="text-sm font-outfit text-secondary">No entries yet.</Text>
      )}
    </View>
  );
}
