import type { ReactNode } from "react";
import { useReducedMotion } from "react-native-reanimated";

import { useCurrentLocationPreview } from "@/hooks/tracking/useCurrentLocationPreview";

export type CurrentLocationPreviewController = ReturnType<typeof useCurrentLocationPreview>;

const inactivePreview: CurrentLocationPreviewController = {
  state: { status: "unavailable" },
  requestPermission: async () => undefined,
  retry: async () => undefined,
  openSettings: async () => undefined,
};

function EnabledCurrentLocationPreviewProvider({
  children,
}: {
  children: (preview: CurrentLocationPreviewController, reducedMotion: boolean) => ReactNode;
}) {
  const preview = useCurrentLocationPreview();
  const reducedMotion = useReducedMotion();
  return children(preview, reducedMotion);
}

export function CurrentLocationPreviewProvider({
  children,
  enabled,
}: {
  children: (preview: CurrentLocationPreviewController, reducedMotion: boolean) => ReactNode;
  enabled: boolean;
}) {
  if (!enabled) return children(inactivePreview, true);
  return <EnabledCurrentLocationPreviewProvider>{children}</EnabledCurrentLocationPreviewProvider>;
}
