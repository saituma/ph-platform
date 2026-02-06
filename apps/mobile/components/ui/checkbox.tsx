import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | React.ReactNode;
  error?: string;
}

export function Checkbox({ checked, onChange, label, error }: CheckboxProps) {
  const { isDark } = useAppTheme();

  return (
    <View>
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={() => onChange(!checked)}
          className={`w-6 h-6 rounded-md items-center justify-center border ${
            checked
              ? "bg-accent border-accent"
              : error
                ? "border-red-500 bg-transparent"
                : "border-app bg-transparent"
          }`}
        >
          {checked && <Feather name="check" size={14} color="white" />}
        </Pressable>
        {label && (
          <Pressable onPress={() => onChange(!checked)} className="flex-1">
            {typeof label === "string" ? (
              <Text className="text-app font-outfit text-base leading-5">
                {label}
              </Text>
            ) : (
              label
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-red-500 text-xs font-outfit ml-9 mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}
