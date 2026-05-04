import React from "react";
import { View, ViewStyle } from "react-native";
import { BottomSheet as HeroBottomSheet } from "heroui-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

type BottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  enableBackdropDismiss?: boolean;
  title?: string;
  style?: ViewStyle;
  disablePanGesture?: boolean;
};

export function BottomSheet({
  isVisible,
  onClose,
  children,
  snapPoints: rawSnapPoints = ["50%"],
  enableBackdropDismiss = true,
  title,
}: BottomSheetProps) {
  const { colors, isDark } = useAppTheme();
  const snapPoints = rawSnapPoints.map((p) =>
    typeof p === "number" ? `${Math.round(p * 100)}%` : p,
  );

  return (
    <HeroBottomSheet
      isOpen={isVisible}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <HeroBottomSheet.Portal>
        <HeroBottomSheet.Overlay className="bg-black/50" />
        <HeroBottomSheet.Content
          snapPoints={snapPoints}
          enablePanDownToClose={enableBackdropDismiss}
          backgroundStyle={{ backgroundColor: colors.card }}
          handleIndicatorStyle={{
            backgroundColor: isDark
              ? "rgba(255,255,255,0.28)"
              : "rgba(15,23,42,0.22)",
          }}
        >
          {title ? (
            <HeroBottomSheet.Title
              className="text-lg font-clash font-bold px-4 pt-2 pb-2"
              style={{ color: colors.text }}
            >
              {title}
            </HeroBottomSheet.Title>
          ) : null}
          <View style={{ flex: 1, padding: 16, paddingBottom: 40 }}>
            {children}
          </View>
        </HeroBottomSheet.Content>
      </HeroBottomSheet.Portal>
    </HeroBottomSheet>
  );
}

export function useBottomSheet() {
  const [isVisible, setIsVisible] = React.useState(false);

  const open = React.useCallback(() => {
    setIsVisible(true);
  }, []);

  const close = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggle = React.useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    open,
    close,
    toggle,
  };
}
