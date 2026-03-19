import styles from "./page.module.css";
import { ShowcaseLanding } from "./showcase-landing";

const heroStats = [
  { value: "3", label: "training plans" },
  { value: "1:1", label: "coach support" },
  { value: "24/7", label: "family access" },
];

const featurePillars = [
  {
    eyebrow: "Home",
    title: "Everything important is clear the moment you open the app.",
    body: "Athletes and parents can see the next session, current plan, and key updates without digging through menus.",
  },
  {
    eyebrow: "Schedule",
    title: "Training sessions, calls, and recovery all live in one place.",
    body: "The schedule keeps weekly coaching simple, with bookings, reminders, and session details organized in one view.",
  },
  {
    eyebrow: "Messages",
    title: "Direct coaching support feels personal, fast, and easy to use.",
    body: "Premium members can message their coach, ask questions, and receive feedback without leaving the app.",
  },
  {
    eyebrow: "Parents",
    title: "Parents stay informed without slowing the athlete down.",
    body: "Billing, support, training guidance, and plan information are easy to manage from the same app experience.",
  },
];

const planTiers = [
  {
    name: "PHP Program",
    label: "Starter",
    summary: "A structured starting point for young footballers building confidence and consistency.",
    price: "Structured plan",
    features: [
      "Age-appropriate weekly training",
      "Warm-up and cooldown support",
      "Simple access to session booking",
    ],
  },
  {
    name: "PHP Plus",
    label: "Most Popular",
    summary: "More support for families who want training, recovery, and education together.",
    price: "More support",
    features: [
      "Recovery and food diary tools",
      "Mobility and off-season guidance",
      "Parent education content",
    ],
  },
  {
    name: "PHP Premium",
    label: "Elite",
    summary: "The most personal coaching experience, with direct support and deeper feedback.",
    price: "Personal coaching",
    features: [
      "Priority coach messaging",
      "Video review from your coach",
      "Priority booking access",
    ],
  },
];

const proofPoints = [
  {
    title: "Built for families",
    text: "The app is designed for both young athletes and the parents supporting their progress.",
  },
  {
    title: "Built for coaching",
    text: "Training plans, sessions, messages, and feedback work together as one connected coaching experience.",
  },
  {
    title: "Built for progress",
    text: "Every part of the app is focused on helping athletes improve with structure, support, and accountability.",
  },
];

const quotes = [
  {
    role: "Guardian",
    quote: "I can see what my child needs to do next and I always know where to go for updates or support.",
  },
  {
    role: "Athlete",
    quote: "It feels like having my training, coach feedback, and schedule all in one place.",
  },
  {
    role: "Coach",
    quote: "The app gives athletes and parents a clearer, calmer way to stay connected to the coaching journey.",
  },
];

export default function Page() {
  return (
    <ShowcaseLanding
      styles={styles}
      heroStats={heroStats}
      featurePillars={featurePillars}
      planTiers={planTiers}
      proofPoints={proofPoints}
      quotes={quotes}
    />
  );
}
