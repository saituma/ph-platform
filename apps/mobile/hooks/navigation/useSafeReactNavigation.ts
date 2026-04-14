import { useIsFocused } from "@react-navigation/native";

export function useSafeIsFocused(fallback = true): boolean {
  try {
    return useIsFocused();
  } catch {
    return fallback;
  }
}

