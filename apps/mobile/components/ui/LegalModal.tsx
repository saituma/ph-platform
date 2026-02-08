import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function LegalModal({
  visible,
  onClose,
  title,
  children,
}: LegalModalProps) {
  const { colors } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6 py-10">
        <View className="bg-app w-full max-h-[80%] rounded-[32px] overflow-hidden shadow-xl border border-app">
          <View className="px-6 py-4 flex-row items-center justify-between border-b border-app bg-app">
            <Text className="text-xl font-clash text-app font-bold">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center bg-secondary rounded-full"
            >
              <Feather
                name="x"
                size={16}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function LegalSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-bold font-clash text-app mb-2 tracking-tight">
        {title}
      </Text>
      <Text className="text-base font-outfit text-secondary leading-relaxed">
        {content}
      </Text>
    </View>
  );
}
