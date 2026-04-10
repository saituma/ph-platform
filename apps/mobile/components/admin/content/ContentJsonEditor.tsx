import React from "react";
import { View, TextInput } from "react-native";
import { Text } from "@/components/ScaledText";
import { SmallAction } from "../AdminShared";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

interface ContentJsonEditorProps {
  patchJson: string;
  setPatchJson: (v: string) => void;
  onSave: () => void;
  onDelete?: () => void;
  isBusy: boolean;
  error: string | null;
  colors: any;
  isDark: boolean;
}

export function ContentJsonEditor({
  patchJson,
  setPatchJson,
  onSave,
  onDelete,
  isBusy,
  error,
  colors,
  isDark,
}: ContentJsonEditorProps) {
  return (
    <View className="gap-4">
      <View
        className="rounded-2xl border p-4"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
        }}
      >
        <Text className="text-[12px] font-outfit text-secondary mb-2 uppercase tracking-wider">
          Patch Data (JSON)
        </Text>
        <TextInput
          multiline
          className="text-[13px] font-outfit text-app leading-5"
          value={patchJson}
          onChangeText={setPatchJson}
          style={{ minHeight: 200, textAlignVertical: "top" }}
          placeholder='{ "name": "..." }'
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error && (
        <Text className="text-[12px] font-outfit text-red-400">{error}</Text>
      )}

      <View className="flex-row gap-3">
        <SmallAction
          label={isBusy ? "Saving..." : "Save Patch"}
          tone="success"
          onPress={onSave}
          disabled={isBusy}
        />
        {onDelete && (
          <SmallAction
            label="Delete Item"
            tone="danger"
            onPress={onDelete}
            disabled={isBusy}
          />
        )}
      </View>
    </View>
  );
}
