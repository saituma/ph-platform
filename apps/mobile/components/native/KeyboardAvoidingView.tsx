import React from "react";
import {
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
} from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

const NativeKeyboardAvoidingView: React.ComponentType<KeyboardAvoidingViewProps> = isExpoGo()
  ? RNKeyboardAvoidingView
  : // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react-native-keyboard-controller").KeyboardAvoidingView;

export function KeyboardAvoidingView(props: KeyboardAvoidingViewProps) {
  return <NativeKeyboardAvoidingView {...props} />;
}

