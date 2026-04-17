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
    name: "PHP Premium",
    description: "Higher-touch coaching with premium support.",
    features: [
      "Everything in PHP Program",
      "Stretching and foam rolling",
      "Off season program access",
      "Parent education hub",
      "Nutrition and food diaries",
      "Physio referral discount (admin configurable)",
    ],
    color: "bg-[#2B7E4F]",
    highlight: "Premium",
    icon: "plus-circle",
  },
  {
    id: "premium",
    name: "PHP Premium Plus",
    description: "Includes semi-private sessions and advanced coaching.",
    features: [
      "Everything in PHP Premium",
      "Semi-private sessions (small group coaching)",
      "Priority messaging status",
      "Client video uploads for feedback",
      "Role model meeting bookings",
      "Lift Lab one-to-one session booking",
    ],
    color: "bg-[#256B44]",
    highlight: "Most Popular",
    icon: "star",
  },
  {
    id: "pro",
    name: "PHP Pro",
    description: "Top-tier service with maximum coaching support.",
    features: [
      "Everything in PHP Premium Plus",
      "Maximum priority access",
      "Advanced performance reviews",
      "Dedicated high-frequency support",
    ],
    color: "bg-[#1C5436]",
    highlight: "Pro",
    icon: "award",
  },
];
