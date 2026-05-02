import React from "react";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { View, type StyleProp, type ViewStyle } from "react-native";
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
  snapPoints,
  children,
  contentStyle,
  cardStyle,
}: DetentSheetProps) {
  const { colors, isDark } = useAppTheme();
  const modalRef = React.useRef<BottomSheetModal>(null);
  const stableSnapPoints = React.useMemo(() => snapPoints, [snapPoints]);

  React.useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    if (open) {
      modal.present();
      return;
    }
    modal.dismiss();
  }, [open]);

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={stableSnapPoints}
      onDismiss={onClose}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: isDark ? "hsl(220, 8%, 12%)" : colors.card }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.25)",
      }}
    >
      <BottomSheetView style={contentStyle}>
        <View style={cardStyle}>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
