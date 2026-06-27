import React, { useEffect } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

type AdaptiveSheetVariant = "bottom" | "page" | "form" | "fullscreen";

type AdaptiveSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: AdaptiveSheetVariant;
  dismissOnBackdropPress?: boolean;
  keyboardAvoiding?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
};

function getPresentationStyle(variant: AdaptiveSheetVariant): ModalProps["presentationStyle"] | undefined {
  if (Platform.OS !== "ios") {
    // bottom variant uses transparent={true}; leaving presentationStyle unset lets
    // RN auto-resolve to "overFullScreen" and avoids the fullScreen+transparent warning
    return variant === "bottom" ? undefined : "fullScreen";
  }
  if (variant === "form") return "formSheet" as ModalProps["presentationStyle"];
  if (variant === "fullscreen") return "fullScreen";
  if (variant === "bottom") return "overFullScreen";
  return "pageSheet";
}

export function AdaptiveSheet({
  visible,
  onClose,
  children,
  variant = "page",
  dismissOnBackdropPress = true,
  keyboardAvoiding = true,
  containerStyle,
  cardStyle,
}: AdaptiveSheetProps) {
  const insets = useAppSafeAreaInsets();
  const isBottom = variant === "bottom";

  // For bottom sheets: listen to keyboard events and animate the card up directly.
  // KeyboardAvoidingView is unreliable inside transparent overFullScreen modals because
  // the KAV is at y=0 but keyboardVerticalOffset=insets.top causes it to undershoot.
  const kbOffset = useSharedValue(0);
  useEffect(() => {
    if (!isBottom || !keyboardAvoiding) return;
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      kbOffset.value = withTiming(e.endCoordinates.height, { duration: e.duration ?? 250 });
    });
    const onHide = Keyboard.addListener(hideEvent, (e) => {
      kbOffset.value = withTiming(0, { duration: e.duration ?? 250 });
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [isBottom, keyboardAvoiding, kbOffset]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    marginBottom: kbOffset.value,
  }));

  const content = isBottom ? (
    <View style={[styles.bottomRoot, containerStyle]}>
      {dismissOnBackdropPress ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      ) : null}
      <Animated.View style={[styles.bottomCard, { paddingBottom: insets.bottom + 12 }, cardStyle, cardAnimStyle]}>
        {children}
      </Animated.View>
    </View>
  ) : (
    <View style={[styles.fullRoot, containerStyle]}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      animationType={isBottom ? "slide" : "slide"}
      transparent={isBottom}
      presentationStyle={getPresentationStyle(variant)}
      statusBarTranslucent={isBottom}
      onRequestClose={onClose}
    >
      {!isBottom && keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.keyboardRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  fullRoot: {
    flex: 1,
  },
  bottomRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  bottomCard: {
    maxHeight: "88%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});
