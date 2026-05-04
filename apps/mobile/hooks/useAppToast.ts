import { useCallback } from "react";
import { useToast } from "heroui-native";

type ToastVariant = "default" | "success" | "warning" | "danger";

export function useAppToast() {
  const { toast } = useToast();

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
      toast.show({
        label,
        description: opts?.description,
        variant: opts?.variant ?? "default",
        duration: opts?.duration,
        actionLabel: opts?.actionLabel,
        onActionPress: opts?.onAction
          ? ({ hide }) => {
              opts.onAction!();
              hide();
            }
          : undefined,
        placement: "top",
      });
    },
    [toast],
  );

  const success = useCallback(
    (label: string, description?: string) =>
      show(label, { description, variant: "success" }),
    [show],
  );

  const error = useCallback(
    (label: string, description?: string) =>
      show(label, { description, variant: "danger" }),
    [show],
  );

  const warning = useCallback(
    (label: string, description?: string) =>
      show(label, { description, variant: "warning" }),
    [show],
  );

  const info = useCallback(
    (label: string, description?: string) => show(label, { description }),
    [show],
  );

  return { show, success, error, warning, info, hide: toast.hide };
}
