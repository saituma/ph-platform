import { useCallback } from "react";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { scheduleLocalNotification } from "@/lib/localNotifications";

export function useProgramPanel() {
  const { isDark, colors } = useAppTheme();

  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, data?: Record<string, unknown>) => {
      try {
        await scheduleLocalNotification({
          title,
          body,
          data,
        });
      } catch (err) {
        if (__DEV__) console.warn("[useProgramPanel] Failed to schedule notification:", err);
      }
    },
    [],
  );

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const formatBytes = useCallback((value: number) => {
    if (!value) return "0 MB";
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(value >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  }, []);

  return {
    isDark,
    colors,
    shadows: Shadows,
    scheduleLocalNotification,
    formatDate,
    formatBytes,
  };
}
