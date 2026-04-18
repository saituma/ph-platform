import { Platform } from "react-native";

/**
 * Android: launching the camera/library from a Modal (or during another transition)
 * can throw "FragmentManager is already executing transactions". Defer the native
 * intent until the UI thread is idle and give FragmentManager a beat to finish.
 */
const ANDROID_PRE_LAUNCH_MS = 220;

export async function safeLaunchImagePicker<T>(launch: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    const ric = (globalThis as any)?.requestIdleCallback as
      | ((cb: () => void, options?: { timeout?: number }) => unknown)
      | undefined;

    if (typeof ric === "function") {
      ric(resolve, { timeout: 300 });
      return;
    }

    // Fallback: next tick.
    setTimeout(resolve, 0);
  });
  if (Platform.OS === "android") {
    await new Promise<void>((r) => setTimeout(r, ANDROID_PRE_LAUNCH_MS));
  }
  return launch();
}
