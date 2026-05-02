import type { ReactNode } from "react";
import { useFeatureFlag, type FeatureFlag } from "#/lib/feature-flags";

type Props = {
  flag: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
};

export function FeatureGate({ flag, children, fallback = null }: Props) {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback}</>;
}
