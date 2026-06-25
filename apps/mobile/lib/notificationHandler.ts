import { getNotifications } from "@/lib/notifications";

getNotifications().then((Notifications) => {
  if (!Notifications) return;
  if (typeof Notifications.setNotificationHandler !== "function") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
});
