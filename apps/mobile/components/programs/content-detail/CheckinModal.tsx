import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

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
  colors: any;
  isDark: boolean;
  surfaceColor: string;
  mutedSurface: string;
  borderSoft: string;
  insetsBottom: number;
}

export function CheckinModal({
  isVisible,
  onClose,
  onSubmit,
  form,
  colors,
  isDark,
  surfaceColor,
  mutedSurface,
  borderSoft,
  insetsBottom,
}: CheckinModalProps) {
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
            backgroundColor: isDark
              ? "rgba(34,197,94,0.18)"
              : "rgba(15,23,42,0.18)",
          }}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
            disabled={form.isSubmitting}
          />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: surfaceColor, maxHeight: "88%" }}
          >
            <KeyboardAwareScrollView
              enableOnAndroid
              extraHeight={Platform.OS === "ios" ? 120 : 160}
              extraScrollHeight={Platform.OS === "ios" ? 40 : 96}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
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
                  style={{ backgroundColor: mutedSurface }}
                >
                  <Feather name="x" size={20} color={colors.accent} />
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
                    style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}
                  >
                    <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                      {field.label}
                    </Text>
                    <TextInput
                      value={field.value}
                      onChangeText={field.setter}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      className="text-base font-outfit text-app mt-1"
                    />
                  </View>
                ))}

                <View
                  className="rounded-2xl border px-4 py-3"
                  style={{ backgroundColor: mutedSurface, borderColor: borderSoft }}
                >
                  <Text className="text-[11px] font-outfit text-secondary uppercase tracking-[1.2px]">
                    Notes (optional)
                  </Text>
                  <TextInput
                    value={form.notes}
                    onChangeText={form.setNotes}
                    placeholder="Anything your coach should know…"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                    className="text-base font-outfit text-app mt-1"
                    style={{ minHeight: 56 }}
                  />
                </View>

                {form.error ? (
                  <Text
                    className="text-xs font-outfit"
                    style={{ color: isDark ? "#FCA5A5" : colors.danger }}
                  >
                    {form.error}
                  </Text>
                ) : null}
                {form.saved ? (
                  <Text
                    className="text-xs font-outfit"
                    style={{ color: colors.accent }}
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
                  style={{ backgroundColor: colors.accent }}
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
            </KeyboardAwareScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
