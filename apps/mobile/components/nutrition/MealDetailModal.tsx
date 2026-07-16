import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "@/components/native/KeyboardAvoidingView";
import { ArrowLeft, Plus, Trash2, ChevronsRight, Camera, Images, RefreshCw, X } from "lucide-react-native";
import { Image } from "expo-image";
import { Text, TextInput } from "@/components/ScaledText";
import { useNutritionTheme } from "@/components/nutrition/theme";
import { MealFoodRow } from "./MealFoodRow";
import { MacroBreakdownTable } from "./MacroBreakdownTable";
import { useMealPhotos, MAX_MEAL_PHOTOS } from "./useMealPhotos";
import type { MealItem, MealSlotData } from "./types";

type MealDetailModalProps = {
  visible: boolean;
  slot: MealSlotData | null;
  onClose: () => void;
  onConfirm: (items: MealItem[], photoUrls: string[]) => void | Promise<void>;
  saving?: boolean;
};

/** Per-item calorie ceiling. Generous (a huge single meal is ~3-4k kcal), but bounded so a
 * mistyped value gets an inline message instead of silently failing to save. */
const MAX_ITEM_KCAL = 50000;

let _nextId = 1;
function genId() {
  return `item_${Date.now()}_${_nextId++}`;
}

type DraftMealItemInput = {
  name: string;
  calories: string;
  weight: string;
  unit: string;
  protein: string;
  carbs: string;
  fat: string;
};

function nutritionNumber(value: string): number {
  return Math.max(0, Number.parseInt(value, 10) || 0);
}

export function buildDraftMealItem(draft: DraftMealItemInput): MealItem | null {
  const name = draft.name.trim();
  if (!name) return null;

  const protein = nutritionNumber(draft.protein);
  const carbs = nutritionNumber(draft.carbs);
  const fat = nutritionNumber(draft.fat);
  const typedCal = nutritionNumber(draft.calories);
  const calories = typedCal > 0 ? typedCal : protein * 4 + carbs * 4 + fat * 9;

  return {
    id: genId(),
    name,
    calories,
    weightGrams: nutritionNumber(draft.weight),
    unit: draft.unit.trim() || "g",
    protein,
    carbs,
    fat,
  };
}

export function MealDetailModal({
  visible,
  slot,
  onClose,
  onConfirm,
  saving = false,
}: MealDetailModalProps) {
  const p = useNutritionTheme();
  const [items, setItems] = useState<MealItem[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftCal, setDraftCal] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftUnit, setDraftUnit] = useState("g");
  const [draftProtein, setDraftProtein] = useState("");
  const [draftCarbs, setDraftCarbs] = useState("");
  const [draftFat, setDraftFat] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const mealPhotos = useMealPhotos();
  const resetPhotos = mealPhotos.reset;
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const resetDraft = useCallback(() => {
    setDraftName("");
    setDraftCal("");
    setDraftWeight("");
    setDraftProtein("");
    setDraftCarbs("");
    setDraftFat("");
    setItemError(null);
  }, []);

  React.useEffect(() => {
    if (visible && slot) {
      setItems(slot.items.length ? [...slot.items] : []);
      setShowAddForm(slot.items.length === 0);
      setDraftUnit("g");
      resetDraft();
      resetPhotos(slot.photos ?? []);
    }
  }, [visible, slot, resetDraft, resetPhotos]);

  const draftItem = useCallback(() => {
    const item = buildDraftMealItem({
      name: draftName,
      calories: draftCal,
      weight: draftWeight,
      unit: draftUnit,
      protein: draftProtein,
      carbs: draftCarbs,
      fat: draftFat,
    });
    if (!item) return null;
    // Sane upper bound keeps a fat-fingered value from quietly failing to save later.
    if (item.calories > MAX_ITEM_KCAL) {
      setItemError(`Max ${MAX_ITEM_KCAL.toLocaleString()} kcal per item`);
      return null;
    }
    return item;
  }, [draftName, draftCal, draftWeight, draftUnit, draftProtein, draftCarbs, draftFat]);

  const addItem = useCallback(() => {
    const item = draftItem();
    if (!item) {
      if (!draftName.trim()) setItemError("Enter a food name first.");
      return;
    }
    setItemError(null);
    setItems((prev) => [...prev, item]);
    resetDraft();
    setShowAddForm(true);
  }, [draftItem, draftName, resetDraft]);

  const saveMeal = useCallback(() => {
    if (saving || mealPhotos.isUploading) return;

    const pendingDraft = draftItem();
    if (draftName.trim() && !pendingDraft) return;

    const nextItems = pendingDraft ? [...items, pendingDraft] : items;
    if (nextItems.length === 0) {
      setShowAddForm(true);
      setItemError("Add at least one food item before saving.");
      return;
    }

    setItemError(null);
    void onConfirm(nextItems, mealPhotos.uploadedUrls);
  }, [draftItem, draftName, items, onConfirm, saving, mealPhotos.isUploading, mealPhotos.uploadedUrls]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const renderMealItem = useCallback(
    ({ item }: { item: MealItem }) => (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <MealFoodRow item={item} />
        </View>
        <Pressable
          onPress={() => removeItem(item.id)}
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 100,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Trash2 size={16} color={p.textMuted} />
        </Pressable>
      </View>
    ),
    [removeItem, p.textMuted],
  );

  const totals = items.reduce(
    (acc, i) => ({
      protein: acc.protein + (i.protein ?? 0),
      carbs: acc.carbs + (i.carbs ?? 0),
      fat: acc.fat + (i.fat ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  if (!slot) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: p.pageBg }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              paddingHorizontal: 20,
              paddingTop: Platform.OS === "ios" ? 16 : 24,
              paddingBottom: 16,
            }}
          >
            <Pressable
              onPress={saving ? undefined : onClose}
              disabled={saving}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 100,
                backgroundColor: p.cardWhite,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ArrowLeft size={20} color={p.textPrimary} />
            </Pressable>
            <Text style={{ flex: 1, fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary }}>
              {slot.label}
            </Text>
          </View>

          {/* Food list */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            renderItem={renderMealItem}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: p.divider, marginLeft: 66 }} />
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textMuted }}>
                  No items yet. Tap + to add food.
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={{ marginTop: 16, gap: 12 }}>
                {/* Food photos */}
                <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>
                      Photos
                    </Text>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>
                      {mealPhotos.photos.length}/{MAX_MEAL_PHOTOS}
                    </Text>
                  </View>
                  {mealPhotos.photos.length === 0 ? (
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted, lineHeight: 17 }}>
                      Snap your plate so your coach can see exactly what you ate.
                    </Text>
                  ) : null}
                  {mealPhotos.photos.length > 0 ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                      {mealPhotos.photos.map((photo) => (
                        <View key={photo.localId} style={{ width: 72, height: 72 }}>
                          <Pressable
                            onPress={
                              photo.status === "done"
                                ? () => setPreviewUri(photo.uri)
                                : photo.status === "error"
                                  ? () => mealPhotos.retry(photo.localId)
                                  : undefined
                            }
                            accessibilityLabel={
                              photo.status === "error" ? "Retry photo upload" : "View photo"
                            }
                            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                          >
                            <Image
                              source={{ uri: photo.uri }}
                              style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: p.inputBg }}
                              contentFit="cover"
                              transition={120}
                            />
                            {photo.status === "processing" || photo.status === "uploading" ? (
                              <View
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  borderRadius: 16,
                                  backgroundColor: "rgba(0,0,0,0.4)",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 2,
                                  overflow: "hidden",
                                }}
                              >
                                {photo.status === "processing" ? (
                                  <>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: "#fff" }}>
                                      Preparing
                                    </Text>
                                  </>
                                ) : (
                                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: "#fff" }}>
                                    {Math.round(photo.progress * 100)}%
                                  </Text>
                                )}
                                <View
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    backgroundColor: "rgba(255,255,255,0.25)",
                                  }}
                                >
                                  <View
                                    style={{
                                      height: 4,
                                      width: `${photo.status === "uploading" ? Math.round(photo.progress * 100) : 0}%`,
                                      backgroundColor: "#fff",
                                    }}
                                  />
                                </View>
                              </View>
                            ) : null}
                            {photo.status === "error" ? (
                              <View
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  borderRadius: 16,
                                  backgroundColor: "rgba(0,0,0,0.55)",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 2,
                                }}
                              >
                                <RefreshCw size={16} color="#fff" />
                                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: "#fff" }}>
                                  Retry
                                </Text>
                              </View>
                            ) : null}
                          </Pressable>
                          <Pressable
                            onPress={() => mealPhotos.remove(photo.localId)}
                            accessibilityLabel="Remove photo"
                            hitSlop={8}
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 22,
                              height: 22,
                              borderRadius: 100,
                              backgroundColor: p.textPrimary,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <X size={12} color={p.cardWhite} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {mealPhotos.hasFailed ? (
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.danger }}>
                      A photo failed to upload. Tap it to retry or remove it.
                    </Text>
                  ) : null}
                  {mealPhotos.photos.length < MAX_MEAL_PHOTOS ? (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {[
                        { label: "Camera", Icon: Camera, onPress: mealPhotos.addFromCamera },
                        { label: "Library", Icon: Images, onPress: mealPhotos.addFromLibrary },
                      ].map(({ label, Icon, onPress }) => (
                        <Pressable
                          key={label}
                          onPress={() => void onPress()}
                          disabled={saving}
                          style={({ pressed }) => ({
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            height: 44,
                            borderRadius: 100,
                            backgroundColor: p.accentSoft,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <Icon size={16} color={p.accent} strokeWidth={2.5} />
                          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
                            {label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* Add item button or form */}
                {showAddForm ? (
                  <View style={{ borderRadius: 22, backgroundColor: p.cardWhite, padding: 16, gap: 12 }}>
                    <TextInput
                      value={draftName}
                      onChangeText={setDraftName}
                      placeholder="Food name (e.g. Egg)"
                      placeholderTextColor={p.textMuted}
                      style={{
                        fontFamily: "Outfit-Regular",
                        fontSize: 15,
                        color: p.textPrimary,
                        backgroundColor: p.inputBg,
                        borderRadius: 14,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                      }}
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TextInput
                        value={draftCal}
                        onChangeText={(v) => {
                          setDraftCal(v.replace(/[^0-9]/g, ""));
                          if (itemError) setItemError(null);
                        }}
                        placeholder="Calories"
                        placeholderTextColor={p.textMuted}
                        keyboardType="number-pad"
                        style={{
                          flex: 1,
                          fontFamily: "Outfit-Regular",
                          fontSize: 15,
                          color: p.textPrimary,
                          backgroundColor: p.inputBg,
                          borderRadius: 14,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      />
                      <TextInput
                        value={draftWeight}
                        onChangeText={(v) => setDraftWeight(v.replace(/[^0-9]/g, ""))}
                        placeholder="Weight"
                        placeholderTextColor={p.textMuted}
                        keyboardType="number-pad"
                        style={{
                          flex: 1,
                          fontFamily: "Outfit-Regular",
                          fontSize: 15,
                          color: p.textPrimary,
                          backgroundColor: p.inputBg,
                          borderRadius: 14,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      />
                      <TextInput
                        value={draftUnit}
                        onChangeText={setDraftUnit}
                        placeholder="g"
                        placeholderTextColor={p.textMuted}
                        style={{
                          width: 60,
                          fontFamily: "Outfit-Regular",
                          fontSize: 15,
                          color: p.textPrimary,
                          backgroundColor: p.inputBg,
                          borderRadius: 14,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      />
                    </View>
                    {/* Per-food macros (grams). Calories auto-fill from these if left blank. */}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {[
                        { value: draftProtein, set: setDraftProtein, label: "Protein g" },
                        { value: draftCarbs, set: setDraftCarbs, label: "Carbs g" },
                        { value: draftFat, set: setDraftFat, label: "Fat g" },
                      ].map((f) => (
                        <TextInput
                          key={f.label}
                          value={f.value}
                          onChangeText={(v) => f.set(v.replace(/[^0-9]/g, ""))}
                          placeholder={f.label}
                          placeholderTextColor={p.textMuted}
                          keyboardType="number-pad"
                          style={{
                            flex: 1,
                            fontFamily: "Outfit-Regular",
                            fontSize: 15,
                            color: p.textPrimary,
                            backgroundColor: p.inputBg,
                            borderRadius: 14,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                          }}
                        />
                      ))}
                    </View>
                    {itemError ? (
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.danger }}>
                        {itemError}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          setItemError(null);
                          setShowAddForm(false);
                        }}
                        disabled={saving}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 44,
                          borderRadius: 100,
                          backgroundColor: p.cardSage,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.textSecondary }}>
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={addItem}
                        disabled={saving}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 44,
                          borderRadius: 100,
                          backgroundColor: p.buttonPrimary,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.buttonPrimaryText }}>
                          Add
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowAddForm(true)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      height: 48,
                      borderRadius: 100,
                      backgroundColor: p.accentSoft,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Plus size={18} color={p.accent} strokeWidth={2.5} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.accent }}>
                      Add Food Item
                    </Text>
                  </Pressable>
                )}

                {/* Macro breakdown */}
                {items.length > 0 ? (
                  <MacroBreakdownTable
                    rows={[
                      { label: "Carbs", grams: totals.carbs },
                      { label: "Protein", grams: totals.protein },
                      { label: "Fats", grams: totals.fat },
                    ]}
                    totalGrams={totals.carbs + totals.protein + totals.fat}
                  />
                ) : null}
              </View>
            }
          />

          {/* Confirm button */}
          <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, paddingTop: 12 }}>
            <Pressable
              onPress={saveMeal}
              disabled={saving || mealPhotos.isUploading}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: 100,
                backgroundColor: p.buttonPrimary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: saving || mealPhotos.isUploading ? 0.72 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.buttonPrimaryText }}>
                {saving ? "Saving meal" : mealPhotos.isUploading ? "Uploading photos" : "Save meal"}
              </Text>
              {saving || mealPhotos.isUploading ? (
                <ActivityIndicator size="small" color={p.buttonPrimaryText} />
              ) : (
                <ChevronsRight size={20} color={p.buttonPrimaryText} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Full-screen photo preview */}
        <Modal
          visible={previewUri !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewUri(null)}
        >
          <Pressable
            onPress={() => setPreviewUri(null)}
            accessibilityLabel="Close photo preview"
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}
          >
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={{ width: "100%", height: "80%" }}
                contentFit="contain"
                transition={150}
              />
            ) : null}
            <View
              style={{
                position: "absolute",
                top: 56,
                right: 20,
                width: 40,
                height: 40,
                borderRadius: 100,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} color="#fff" />
            </View>
          </Pressable>
        </Modal>
      </View>
    </Modal>
  );
}
