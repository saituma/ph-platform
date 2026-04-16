import { InteractionManager, Platform } from "react-native";

/**
 * Android: launching the camera/library from a Modal (or during another transition)
 * can throw "FragmentManager is already executing transactions". Defer the native
 * intent until the UI thread is idle and give FragmentManager a beat to finish.
 */
const ANDROID_PRE_LAUNCH_MS = 220;

export async function safeLaunchImagePicker<T>(launch: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
  if (Platform.OS === "android") {
    await new Promise<void>((r) => setTimeout(r, ANDROID_PRE_LAUNCH_MS));
  }
  return launch();
}
