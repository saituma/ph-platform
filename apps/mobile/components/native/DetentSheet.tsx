import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { BottomSheet } from "heroui-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type DetentSheetProps = {
  open: boolean;
  onClose: () => void;
  snapPoints: (string | number)[];
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
};

export function DetentSheet({
  open,
  onClose,
  snapPoints: rawSnapPoints,
  children,
  contentStyle,
  cardStyle,
}: DetentSheetProps) {
  const { colors, isDark } = useAppTheme();
  const snapPoints = React.useMemo(
    () => rawSnapPoints.map((p) => (typeof p === "number" ? `${Math.round(p * 100)}%` : p)),
    [rawSnapPoints],
  );

  return (
    <BottomSheet isOpen={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay className="bg-black/40" />
        <BottomSheet.Content
          snapPoints={snapPoints}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: isDark ? "hsl(220, 8%, 12%)" : colors.card }}
          handleIndicatorStyle={{
            backgroundColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.25)",
          }}
        >
          <View style={contentStyle}>
            <View style={cardStyle}>{children}</View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
