import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
