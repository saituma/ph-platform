import React, { useCallback, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { ArrowLeft, Plus, Trash2, ChevronsRight } from "lucide-react-native";
import { Text, TextInput } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { MealFoodRow } from "./MealFoodRow";
import { MacroBreakdownTable } from "./MacroBreakdownTable";
import type { MealItem, MealSlotData } from "./types";

type MealDetailModalProps = {
  visible: boolean;
  slot: MealSlotData | null;
  onClose: () => void;
  onConfirm: (items: MealItem[]) => void;
};

let _nextId = 1;
function genId() {
  return `item_${Date.now()}_${_nextId++}`;
}

export function MealDetailModal({
  visible,
  slot,
  onClose,
  onConfirm,
}: MealDetailModalProps) {
  const p = useAdminPastel();
  const [items, setItems] = useState<MealItem[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftCal, setDraftCal] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftUnit, setDraftUnit] = useState("g");
  const [showAddForm, setShowAddForm] = useState(false);

  React.useEffect(() => {
    if (visible && slot) {
      setItems(slot.items.length ? [...slot.items] : []);
      setShowAddForm(slot.items.length === 0);
      setDraftName("");
      setDraftCal("");
      setDraftWeight("");
      setDraftUnit("g");
    }
  }, [visible, slot]);

  const addItem = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;
    const cal = Math.max(0, parseInt(draftCal, 10) || 0);
    const weight = Math.max(0, parseInt(draftWeight, 10) || 0);
    setItems((prev) => [
      ...prev,
      { id: genId(), name, calories: cal, weightGrams: weight, unit: draftUnit || "g" },
    ]);
    setDraftName("");
    setDraftCal("");
    setDraftWeight("");
    setShowAddForm(false);
  }, [draftName, draftCal, draftWeight, draftUnit]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const totalCalories = items.reduce((s, i) => s + i.calories, 0);
  const estCarbs = Math.round(totalCalories * 0.45 / 4);
  const estProtein = Math.round(totalCalories * 0.25 / 4);
  const estFats = Math.round(totalCalories * 0.30 / 9);

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
              onPress={onClose}
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
            renderItem={({ item }) => (
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
            )}
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
                        onChangeText={(v) => setDraftCal(v.replace(/[^0-9]/g, ""))}
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
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => setShowAddForm(false)}
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
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 44,
                          borderRadius: 100,
                          backgroundColor: p.accent,
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
                      { label: "Carbs", grams: estCarbs },
                      { label: "Protein", grams: estProtein },
                      { label: "Fats", grams: estFats },
                    ]}
                    totalGrams={estCarbs + estProtein + estFats}
                  />
                ) : null}
              </View>
            }
          />

          {/* Confirm button */}
          <View style={{ paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24, paddingTop: 12 }}>
            <Pressable
              onPress={() => onConfirm(items)}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: 100,
                backgroundColor: p.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.buttonPrimaryText }}>
                Confirm
              </Text>
              <ChevronsRight size={20} color={p.buttonPrimaryText} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
