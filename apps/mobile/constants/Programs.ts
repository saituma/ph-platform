import { ProgramTier } from "@/components/ProgramCard";

export const PROGRAM_TIERS: ProgramTier[] = [
  {
    id: "php",
    name: "PHP Program",
    description: "Restricted app access for core programme delivery.",
    features: [
      "Coach module access",
      "Messaging features",
      "Schedule and calendar",
      "Restricted content access",
    ],
    color: "bg-[#2F8F57]",
    highlight: "Starter",
    icon: "activity",
  },
  {
    id: "premium",
    name: "PHP Premium",
    description: "Full app access for the main athlete experience.",
    features: [
      "Full programs library",
      "Nutrition and food diaries",
      "Parent platform",
      "Video upload for coach response",
      "Tracking, achievements, and referrals",
    ],
    color: "bg-[#2B7E4F]",
    highlight: "Premium",
    icon: "star",
  },
  {
    id: "plus",
    name: "PHP Premium Plus",
    description: "PHP Premium app access with semi-private in-person sessions.",
    features: [
      "Same full app access as PHP Premium",
      "Includes in-person semi-private sessions",
    ],
    color: "bg-[#256B44]",
    highlight: "Semi-private",
    icon: "plus-circle",
  },
  {
    id: "pro",
    name: "PHP Pro",
    description: "PHP Premium app access with 1:1 in-person sessions.",
    features: [
      "Same full app access as PHP Premium",
      "Includes 1:1 in-person sessions",
    ],
    color: "bg-[#1C5436]",
    highlight: "Pro",
    icon: "award",
  },
];
