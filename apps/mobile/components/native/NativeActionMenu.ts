import { ActionSheetIOS, Alert, Platform } from "react-native";

type NativeActionMenuOption = {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
  cancel?: boolean;
};

type NativeActionMenuInput = {
  title: string;
  message?: string;
  options: NativeActionMenuOption[];
};

export function showNativeActionMenu({ title, message, options }: NativeActionMenuInput) {
  const hasCancel = options.some((option) => option.cancel);
  const menuOptions = hasCancel
    ? options
    : [...options, { label: "Cancel", cancel: true } satisfies NativeActionMenuOption];

  if (Platform.OS === "ios") {
    const labels = menuOptions.map((option) => option.label);
    const cancelButtonIndex = menuOptions.findIndex((option) => option.cancel);
    const destructiveButtonIndex = menuOptions.findIndex((option) => option.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: labels,
        cancelButtonIndex: cancelButtonIndex >= 0 ? cancelButtonIndex : undefined,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (buttonIndex) => {
        const option = menuOptions[buttonIndex];
        if (!option || option.cancel) return;
        option.onPress?.();
      },
    );
    return;
  }

  Alert.alert(
    title,
    message,
    menuOptions.map((option) => ({
      text: option.label,
      style: option.cancel ? "cancel" : option.destructive ? "destructive" : "default",
      onPress: option.cancel ? undefined : option.onPress,
    })),
  );
}
