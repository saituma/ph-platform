import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView, ScrollView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useAdminPastel } from "@/components/admin/AdminUI";

interface CheckinModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: {
    rpe: string;
    setRpe: (v: string) => void;
    soreness: string;
    setSoreness: (v: string) => void;
    fatigue: string;
    setFatigue: (v: string) => void;
    notes: string;
    setNotes: (v: string) => void;
    error: string | null;
    isSubmitting: boolean;
    saved: boolean;
  };
  insetsBottom: number;
}

export function CheckinModal({
  isVisible,
  onClose,
  onSubmit,
  form,
  insetsBottom,
}: CheckinModalProps) {
  const p = useAdminPastel();

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          className="flex-1 justify-end"
          style={{
            backgroundColor: "rgba(15,23,42,0.18)",
          }}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
            disabled={form.isSubmitting}
          />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: p.cardWhite, maxHeight: "88%" }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: Math.max(insetsBottom, 12) + 16,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-clash text-app font-bold">
                  Session Check-in
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={form.isSubmitting}
                  className="h-10 w-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: p.inputBg }}
                >
                  <Feather name="x" size={20} color={p.accent} />
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-outfit text-secondary mb-4">
                Log intensity and how your body feels so your coach can adjust
                training load.
              </Text>

              <View className="gap-3">
                {[
                  { label: "RPE (1–10)", value: form.rpe, setter: form.setRpe, placeholder: "e.g. 7" },
                  { label: "Soreness (0–10)", value: form.soreness, setter: form.setSoreness, placeholder: "e.g. 3" },
                  { label: "Fatigue (0–10)", value: form.fatigue, setter: form.setFatigue, placeholder: "e.g. 4" },
                ].map((field, idx) => (
                  <View
                    key={idx}
                    className="rounded-2xl border px-4 py-3"
                    style={{ backgroundColor: p.inputBg, borderColor: p.divider }}
                  >
                    <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                      {field.label}
                    </Text>
                    <TextInput
                      value={field.value}
                      onChangeText={field.setter}
                      placeholder={field.placeholder}
                      placeholderTextColor={p.textSecondary}
                      keyboardType="number-pad"
                      className="text-base font-outfit text-app mt-1"
                    />
                  </View>
                ))}

                <View
                  className="rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: p.inputBg, borderColor: p.divider }}
                >
                  <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                    Notes (optional)
                  </Text>
                  <TextInput
                    value={form.notes}
                    onChangeText={form.setNotes}
                    placeholder="Anything your coach should know…"
                    placeholderTextColor={p.textSecondary}
                    multiline
                    textAlignVertical="top"
                    className="text-base font-outfit text-app mt-1"
                    style={{ minHeight: 56 }}
                  />
                </View>

                {form.error ? (
                  <Text
                    className="text-xs font-outfit"
                    style={{ color: p.danger }}
                  >
                    {form.error}
                  </Text>
                ) : null}
                {form.saved ? (
                  <Text
                    className="text-xs font-outfit"
                    style={{ color: p.accent }}
                  >
                    Saved. Nice work.
                  </Text>
                ) : null}

                <Pressable
                  onPress={onSubmit}
                  disabled={form.isSubmitting}
                  className={`mt-1 rounded-2xl px-4 py-4 flex-row items-center justify-center gap-2 ${
                    form.isSubmitting ? "opacity-70" : ""
                  }`}
                  style={{ backgroundColor: p.accent }}
                >
                  {form.isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Feather name="save" size={18} color="#ffffff" />
                  )}
                  <Text className="text-white font-outfit font-bold text-sm uppercase tracking-[1.3px]">
                    {form.isSubmitting ? "Saving…" : "Save Check-in"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
