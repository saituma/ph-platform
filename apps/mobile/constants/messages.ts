export type Thread = {
  id: string;
  name: string;
  role: string;
  preview: string;
  time: string;
  unread?: number;
  premium?: boolean;
  pinned?: boolean;
  responseTime?: string;
  lastSeen?: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  from: "coach" | "user";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
};

export const THREADS: Thread[] = [
  {
    id: "coach",
    name: "Coach Oliver",
    role: "Head Coach",
    preview: "Great work on your last session. Let's adjust your warm-up.",
    time: "2m",
    unread: 2,
    premium: true,
    pinned: true,
    responseTime: "Usually replies in 2 hrs",
    lastSeen: "Active now",
  },
  {
    id: "support",
    name: "Lift Lab Support",
    role: "Admin",
    preview: "Your booking is confirmed for Tuesday at 13:00.",
    time: "1h",
    unread: 1,
    responseTime: "Replies within 1 day",
    lastSeen: "Active 2h ago",
  },
  {
    id: "nutrition",
    name: "Nutrition Desk",
    role: "Parent Platform",
    preview: "New guide: Fueling for game day is live.",
    time: "1d",
    responseTime: "Replies within 1 day",
    lastSeen: "Active 1d ago",
  },
];

export const MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    threadId: "coach",
    from: "coach",
    text: "Great work on your last session. Your sprint starts are already sharper.",
    time: "9:12 AM",
  },
  {
    id: "m2",
    threadId: "user",
    from: "user",
    text: "Thanks coach! My quads felt tight after the last set though.",
    time: "9:15 AM",
    status: "read",
  },
  {
    id: "m3",
    threadId: "coach",
    from: "coach",
    text: "Totally normal. Let's add a 3-minute quad stretch in your warm-up and a 60s couch stretch post-session.",
    time: "9:18 AM",
  },
  {
    id: "m4",
    threadId: "user",
    from: "user",
    text: "Got it. Can you review my jump video from yesterday?",
    time: "9:22 AM",
    status: "read",
  },
  {
    id: "m5",
    threadId: "coach",
    from: "coach",
    text: "Absolutely. Send it over and I will mark it up with notes.",
    time: "9:24 AM",
  },
  {
    id: "m6",
    threadId: "support",
    from: "coach",
    text: "Your booking is confirmed for Tuesday at 13:00. See you then.",
    time: "Yesterday",
  },
  {
    id: "m7",
    threadId: "nutrition",
    from: "coach",
    text: "New guide is live: Fueling for game day. Want the PDF link?",
    time: "2 days ago",
  },
];
