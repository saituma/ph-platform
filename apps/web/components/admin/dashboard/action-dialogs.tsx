"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Dumbbell, Video, BookOpen, CalendarPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";

export type DashboardDialog =
  | null
  | "message"
  | "program"
  | "exercise"
  | "article"
  | "slots";

type ActionDialogsProps = {
  active: DashboardDialog;
  onClose: () => void;
};

const DIALOG_CONFIG = {
  message: {
    title: "New Message",
    description: "Send a direct message, team announcement, or group message.",
    icon: MessageCircle,
    actions: [
      { label: "Open Messaging", href: "/messaging" },
    ],
  },
  program: {
    title: "Create Program",
    description: "Build a new training program with modules, sessions, and exercises.",
    icon: Dumbbell,
    actions: [
      { label: "Go to Programs", href: "/programs" },
    ],
  },
  exercise: {
    title: "Add Exercise Content",
    description: "Upload exercise videos and coaching notes to the library.",
    icon: Video,
    actions: [
      { label: "Open Exercise Library", href: "/exercise-library" },
    ],
  },
  article: {
    title: "Publish Content",
    description: "Create articles, testimonials, or update your profile content.",
    icon: BookOpen,
    actions: [
      { label: "Manage Content", href: "/content/profile" },
      { label: "Testimonials", href: "/content/testimonials" },
    ],
  },
  slots: {
    title: "Open Booking Slots",
    description: "Set your availability and create new booking slots for athletes.",
    icon: CalendarPlus,
    actions: [
      { label: "Manage Bookings", href: "/bookings" },
    ],
  },
} as const;

export function ActionDialogs({ active, onClose }: ActionDialogsProps) {
  const router = useRouter();

  if (!active) return null;

  const config = DIALOG_CONFIG[active];
  const Icon = config.icon;

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {config.actions.map((action) => (
            <Button
              key={action.href}
              className="w-full"
              onClick={() => {
                onClose();
                router.push(action.href);
              }}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
