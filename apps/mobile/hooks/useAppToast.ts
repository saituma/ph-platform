import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";

type ToastVariant = "default" | "success" | "warning" | "danger";

export function useAppToast() {
  const toast = useToast();

  const show = useCallback(
    (
      label: string,
      opts?: {
        description?: string;
        variant?: ToastVariant;
        duration?: number | "persistent";
        actionLabel?: string;
        onAction?: () => void;
      },
    ) => {
      const variant =
        opts?.variant === "danger"
          ? "error"
          : opts?.variant === "default"
            ? "info"
            : (opts?.variant ?? "info");
      toast.toast({
        title: label,
        description: opts?.description,
        variant,
        duration: opts?.duration === "persistent" ? 0 : (opts?.duration ?? 2000),
        action: opts?.actionLabel
          ? { label: opts.actionLabel, onPress: () => opts.onAction?.() }
          : undefined,
      });
    },
    [toast],
  );

  const success = useCallback(
    (label: string, description?: string) =>
      toast.success(label, description),
    [toast],
  );

  const error = useCallback(
    (label: string, description?: string) =>
      toast.error(label, description),
    [toast],
  );

  const warning = useCallback(
    (label: string, description?: string) =>
      toast.warning(label, description),
    [toast],
  );

  const info = useCallback(
    (label: string, description?: string) =>
      toast.info(label, description),
    [toast],
  );

  return { show, success, error, warning, info, hide: toast.dismissAll };
}
