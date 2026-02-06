import { ProgramTier } from "@/components/ProgramCard";

export const PROGRAM_TIERS: ProgramTier[] = [
  {
    id: "php",
    name: "PHP Program",
    description: "Core age-appropriate training for development.",
    features: [
      "Structured sessions",
      "Warmups & Cooldowns",
      "Physio referral (standard)",
      "1-to-1 Booking entry",
    ],
    color: "bg-blue-600",
    icon: "activity",
  },
  {
    id: "plus",
    name: "PHP Plus",
    description: "Enhanced training with nutrition and recovery focus.",
    features: [
      "Everything in PHP",
      "Stretching & Foam Rolling",
      "Parent Education hub",
      "Nutrition & Food Diaries",
      "Physio Referral Discount",
    ],
    color: "bg-purple-600",
    icon: "plus-circle",
  },
  {
    id: "premium",
    name: "PHP Premium",
    description: "Elite 1:1 individualized coaching and support.",
    features: [
      "Individualized Programming",
      "Priority Messaging (Badge)",
      "Video Feedback review",
      "Role Model Meetings",
      "Lift Lab 1:1 Booking",
    ],
    color: "bg-amber-600",
    icon: "star",
  },
];
