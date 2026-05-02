import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ModalProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
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

function getPresentationStyle(variant: AdaptiveSheetVariant): ModalProps["presentationStyle"] {
  if (Platform.OS !== "ios") return "fullScreen";
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
  const content = isBottom ? (
    <View style={[styles.bottomRoot, containerStyle]}>
      {dismissOnBackdropPress ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      ) : null}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 12 }, cardStyle]}>
        {children}
      </View>
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
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.keyboardRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
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
