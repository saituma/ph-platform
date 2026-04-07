import { HelpCategory, HelpArticle, QuickAction, FaqItemType } from "./types";

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: "all", icon: "grid", label: "All topics", description: "Browse every guide in one place." },
  { id: "account", icon: "user", label: "Account", description: "Profile, guardians, and sign-in basics." },
  { id: "training", icon: "activity", label: "Training", description: "Programs, schedules, and video review help." },
  { id: "billing", icon: "credit-card", label: "Billing", description: "Membership, renewals, and plan updates." },
  { id: "security", icon: "shield", label: "Security", description: "Passwords, privacy, and permissions." },
];

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "feedback",
    icon: "message-square",
    label: "Message support",
    description: "Best for billing, bugs, scheduling changes, and account issues.",
    route: "/feedback",
  },
  {
    id: "permissions",
    icon: "smartphone",
    label: "Check permissions",
    description: "Fix notifications, camera, and media access fast.",
    route: "/permissions",
  },
  {
    id: "privacy",
    icon: "lock",
    label: "Privacy & safety",
    description: "Review data handling and account protection details.",
    route: "/privacy-policy",
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "reset-password",
    icon: "key",
    categoryId: "security",
    categoryLabel: "Security",
    title: "Resetting your password safely",
    summary: "If you lose access, act quickly and update shared guardian credentials after you get back in.",
    highlights: [
      "Try a normal sign-in first to rule out a saved-password mismatch.",
      "If access still fails, send support a short message from the app so they can verify your account.",
      "Use a strong new password and avoid reusing one from another service.",
    ],
    keywords: ["password", "login", "sign in", "access", "reset"],
    actionLabel: "Open support message",
    actionRoute: "/feedback",
  },
  {
    id: "training-plan",
    icon: "calendar",
    categoryId: "training",
    categoryLabel: "Training",
    title: "Changing a training plan or schedule",
    summary: "The fastest requests include the athlete name, week affected, and the exact session that needs attention.",
    highlights: [
      "Mention whether the issue is a missed session, wrong plan, or timing conflict.",
      "Include any recent changes that happened before the problem showed up.",
      "Premium members can reference uploaded training videos for extra context.",
    ],
    keywords: ["training", "schedule", "program", "calendar", "session"],
    actionLabel: "Contact support",
    actionRoute: "/feedback",
  },
  {
    id: "family-members",
    icon: "users",
    categoryId: "account",
    categoryLabel: "Account",
    title: "Managing guardian and athlete details",
    summary: "Keep names, emails, and linked household access up to date so the right person gets updates.",
    highlights: [
      "Review profile details after new enrollments or season changes.",
      "Use one active email per guardian to reduce missed communication.",
      "When you request help, include both athlete and guardian names together.",
    ],
    keywords: ["family", "guardian", "athlete", "profile", "account"],
    actionLabel: "Open profile settings",
    actionRoute: "/profile-settings",
  },
  {
    id: "notifications",
    icon: "bell",
    categoryId: "security",
    categoryLabel: "Security",
    title: "Fixing notifications, camera, or upload access",
    summary: "Most device issues are caused by app permissions being disabled after an update or reinstall.",
    highlights: [
      "Check notifications, camera, and media permissions in the app settings flow.",
      "Re-open the app after changing permissions so access refreshes cleanly.",
      "If uploads still fail, share the device type and what happened before the issue.",
    ],
    keywords: ["notifications", "camera", "upload", "permissions", "media"],
    actionLabel: "Review permissions",
    actionRoute: "/permissions",
  },
  {
    id: "billing-plan",
    icon: "credit-card",
    categoryId: "billing",
    categoryLabel: "Billing",
    title: "Membership, renewals, and plan questions",
    summary: "Billing help moves faster when you share the plan name, renewal date, and the email linked to the account.",
    highlights: [
      "Mention whether you need an upgrade, renewal check, or payment support.",
      "Never send full card details through the app.",
      "Attach screenshots only if they do not reveal private payment information.",
    ],
    keywords: ["billing", "payment", "membership", "plan", "renewal"],
    actionLabel: "Message billing support",
    actionRoute: "/feedback",
  },
  {
    id: "video-review",
    icon: "video",
    categoryId: "training",
    categoryLabel: "Training",
    title: "Uploading a training video for review",
    summary: "A clear angle, good lighting, and one line of context make coach feedback much more useful.",
    highlights: [
      "Keep the athlete fully in frame and record in steady light.",
      "Add a short note about the drill or movement you want reviewed.",
      "Premium members can upload from the More tab when access is enabled.",
    ],
    keywords: ["video", "review", "upload", "premium", "coach"],
    actionLabel: "Go to support",
    actionRoute: "/feedback",
  },
];

export const FAQS: FaqItemType[] = [
  {
    id: "response-time",
    question: "How quickly should I expect a reply?",
    answer: "Most support requests are answered within one business day. Clear details like athlete name, device, and what changed usually speed things up.",
  },
  {
    id: "best-channel",
    question: "When should I use support instead of app settings?",
    answer: "Use app settings for things you can update yourself, like permissions and profile details. Use support for billing issues, sign-in problems, plan changes, or anything that needs coach or admin review.",
  },
  {
    id: "what-to-send",
    question: "What details help support solve an issue faster?",
    answer: "Share the athlete name, a short summary of the issue, what you expected to happen, and any screenshot that does not expose private information.",
  },
];

export const POPULAR_SEARCHES = ["password", "schedule", "billing", "notifications"];
