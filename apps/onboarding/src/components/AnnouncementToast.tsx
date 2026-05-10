import { useRef } from "react";
import { toast } from "sonner";
import { usePortalSocketEvent } from "@/portal/PortalSocketContext";

/**
 * Listens for realtime notification:new events from the socket and shows a
 * sonner toast when the notification type is "announcement".
 *
 * No new packages required — sonner is already installed and its <Toaster />
 * is mounted in __root.tsx.
 */
export function AnnouncementToast() {
  // Track the last shown announcement id to avoid duplicate toasts
  const shownIds = useRef<Set<string | number>>(new Set());

  // The API emits "notification:new" for push-notification fan-outs.
  // Announcement push intents carry data.type === "announcement".
  usePortalSocketEvent<{
    id?: number | string;
    type?: string | null;
    content?: string | null;
    title?: string | null;
    link?: string | null;
    data?: { type?: string; url?: string; contentId?: string };
  }>("notification:new", (payload) => {
    const notifType = payload?.type ?? payload?.data?.type ?? "";
    if (notifType !== "announcement") return;

    const id = payload?.id ?? payload?.data?.contentId;
    if (id !== undefined && shownIds.current.has(id)) return;
    if (id !== undefined) shownIds.current.add(id);

    const title = payload?.title ?? payload?.content ?? "New Announcement";

    toast.info(title, {
      description: "A new announcement has been posted.",
      duration: 5000,
      position: "top-center",
      action: {
        label: "View",
        onClick: () => {
          window.location.href = "/portal/announcements";
        },
      },
    });
  });

  return null;
}
