import { ProgramTier } from "@/components/ProgramCard";

export const PROGRAM_TIERS: ProgramTier[] = [
  {
    id: "php",
    name: "PHP Program",
    description: "Core age-appropriate training for development.",
    features: [
      "Age-appropriate structured sessions",
      "Built-in warmups and cooldowns",
      "Physio referral link (no discount)",
      "Booking entry for one-to-one sessions",
    ],
    color: "bg-[#2F8F57]",
    highlight: "Starter",
    icon: "activity",
  },
  {
    id: "plus",
    name: "PHP Plus",
    description: "Enhanced training with nutrition and recovery focus.",
    features: [
      "Everything in PHP Program",
      "Stretching and foam rolling",
      "Off season program access",
      "Parent education hub",
      "Nutrition and food diaries",
      "Physio referral discount (admin configurable)",
    ],
    color: "bg-[#2B7E4F]",
    highlight: "Most Popular",
    icon: "plus-circle",
  },
  {
    id: "premium",
    name: "PHP Premium",
    description: "Elite 1:1 individualized coaching and support.",
    features: [
      "Fully individualized programming",
      "Priority messaging status",
      "Client video uploads for feedback",
      "Role model meeting bookings",
      "Lift Lab one-to-one session booking",
    ],
    color: "bg-[#256B44]",
    highlight: "Elite",
    icon: "star",
  },
];
