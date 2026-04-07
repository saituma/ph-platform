import React from "react";
import { View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";
import { Text, TextInput } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

export function InputField({
  label,
  value,
  onChangeText,
  editable = true,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  placeholder?: string;
  icon?: any;
}) {
  const { colors } = useAppTheme();
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold font-outfit text-secondary ml-1">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-app border border-app rounded-2xl h-14 px-4 ${!editable ? "opacity-60" : ""}`}
      >
        {icon && (
          <View className="h-8 w-8 rounded-xl bg-secondary items-center justify-center mr-3">
            <Feather name={icon} size={16} className="text-accent" />
          </View>
        )}
        <TextInput
          className="flex-1 text-app font-outfit text-base"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
        />
      </View>
    </View>
  );
}
