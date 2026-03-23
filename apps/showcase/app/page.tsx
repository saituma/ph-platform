import styles from "./page.module.css";
import { ShowcaseLanding } from "./showcase-landing";

const heroStats = [
  { value: "3", label: "PHASED PROGRAMS" },
  { value: "1:1", label: "PRO FEEDBACK" },
  { value: "24/7", label: "FAMILY HUB" },
];

const featurePillars = [
  {
    eyebrow: "01. DASHBOARD",
    title: "Intelligence built around your training day.",
    body: "The central hub prioritizes sessions, coach updates, and recovery protocols so you're always prepared for the pitch.",
  },
  {
    eyebrow: "02. PROGRAMS",
    title: "Structured delivery for every athlete level.",
    body: "Top-tabbed navigation for Warmups, Cooldowns, and Sessions. Includes integrated video demonstrations for every movement.",
  },
  {
    eyebrow: "03. CONNECT",
    title: "Direct pathways to elite coaching feedback.",
    body: "Secure messaging and video review loops bridge the gap between amateur play and professional performance pathways.",
  },
  {
    eyebrow: "04. PARENT HUB",
    title: "Education grounded in athletic science.",
    body: "A dedicated library for parents covering growth, maturation, nutrition, and injury prevention for young athletes.",
  },
];

const planTiers = [
  {
    name: "PHP PROGRAM",
    label: "FOUNDATION",
    summary: "Age-appropriate structured sessions for building consistency and mastery.",
    price: "BASE ACCESS",
    features: [
      "5 Top Tabs: Program, Warmups, Cooldown, Book In, Physio Referral",
      "2-3 Structured Phased Sessions",
      "Integrated Exercise Video Library",
      "Standard Physio Referral Access",
    ],
  },
  {
    name: "PHP PLUS",
    label: "PERFORMANCE",
    summary: "Advanced support featuring nutrition science and parent education protocols.",
    price: "ENHANCED ACCESS",
    features: [
      "8 Top Tabs: Nutrition, Stretching, Off-Season, Parent Ed",
      "Food Diary with Text/Photo Logging",
      "Onboarding-based Program Assignment",
      "Physio Referral Discounts (X%)",
    ],
  },
  {
    name: "PHP PREMIUM",
    label: "ELITE",
    summary: "1:1 Pro mentorship with fully individualized movement screening and video reviews.",
    price: "PRO PATHWAY",
    features: [
      "10 Top Tabs: Mobility, Video Upload, Custom Bookings",
      "Client Video Upload for Direct Feedback",
      "Individualized Phased Programming",
      "Priority 1:1 Messaging & Calls",
    ],
  },
];

const proofPoints = [
  {
    title: "V1 DEPLOYMENT",
    text: "Engineered for iOS and Android with secure authentication and role-based family access.",
  },
  {
    title: "PRO PATHWAYS",
    text: "Built by Piers Hatcliff to bridge the gap between amateur play and elite professional standards.",
  },
  {
    title: "UNIFIED HUB",
    text: "One environment for programs, messaging, scheduling, and parent education.",
  },
];

const quotes = [
  {
    role: "Guardian",
    quote: "PH Performance gives us a clear roadmap. We always know exactly what needs to happen next.",
  },
  {
    role: "Athlete",
    quote: "The direct video feedback has completely changed how I approach my drive phase mechanics.",
  },
  {
    role: "Coach",
    quote: "Our mission is to provide professional-grade development to the next generation of athletes.",
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
