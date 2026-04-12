import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { getNotifications } from "@/lib/notifications";
import { useAppSelector } from "@/store/hooks";
import { getMessagesRolePrefix, messagesThreadHref } from "@/lib/messages/roleMessageRoutes";

export function usePushNotificationResponses(enabled: boolean) {
  const router = useRouter();
  const lastHandledNotificationRef = useRef<string | null>(null);
  const { appRole, apiUserRole } = useAppSelector((state) => state.user);
  const rolePrefix = getMessagesRolePrefix({ appRole, apiUserRole });

  const isSafeInternalPath = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    const url = value.trim();
    if (!url.startsWith("/")) return false;
    if (url.startsWith("//")) return false;
    if (url.includes("://")) return false;
    if (url.includes("..")) return false;
    return true;
  };

  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;

    const handleNotificationResponse = (response: any) => {
      const identifier = response?.notification?.request?.identifier;
      if (identifier && identifier === lastHandledNotificationRef.current)
        return;
      if (identifier) lastHandledNotificationRef.current = identifier;

      const data = response?.notification?.request?.content?.data as
        | {
            threadId?: string;
            type?: string;
            screen?: string;
            url?: string;
            contentId?: string | number;
            videoUploadId?: string | number;
          }
        | undefined;

      if (data?.url) {
        if (!isSafeInternalPath(data.url)) return;
        const url = data.url.trim();
        if (url.startsWith("/messages/")) {
          const thread = url.replace("/messages/", "");
          router.push(messagesThreadHref(rolePrefix, thread));
          return;
        }
        router.push(url as any);
        return;
      }
      const threadId = data?.threadId;
      if (threadId) {
        router.push(messagesThreadHref(rolePrefix, String(threadId)));
        return;
      }
      if (data?.type === "booking" || data?.screen === "schedule") {
        router.push("/(tabs)/schedule");
        return;
      }
      if (data?.screen === "messages") {
        router.push("/(tabs)/messages");
        return;
      }
      if (data?.screen === "plans" || data?.type === "plan_approved") {
        router.push("/plans");
        return;
      }
      if (
        data?.screen === "physio-referral" ||
        data?.type === "physio-referral"
      ) {
        router.push("/physio-referral");
        return;
      }
      if (
        data?.type === "video_reviewed" &&
        (data?.contentId != null || data?.videoUploadId != null)
      ) {
        if (data.contentId != null) {
          router.push(`/programs/content/${String(data.contentId)}`);
        } else {
          router.push("/video-upload");
        }
        return;
      }
    };

    getNotifications().then(async (Notifications) => {
      if (!Notifications) return;
      if (
        typeof Notifications.addNotificationResponseReceivedListener ===
        "function"
      ) {
        sub = Notifications.addNotificationResponseReceivedListener(
          handleNotificationResponse,
        );
      }
      if (
        typeof Notifications.getLastNotificationResponseAsync === "function"
      ) {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          handleNotificationResponse(response);
          if (
            typeof Notifications.clearLastNotificationResponseAsync ===
            "function"
          ) {
            await Notifications.clearLastNotificationResponseAsync();
          }
        }
      }
    });

    return () => {
      sub?.remove();
    };
  }, [enabled, rolePrefix, router]);
}
