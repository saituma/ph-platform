# Mobile App UI System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the mobile app visual system toward a cleaner Instagram-like baseline with athletic clarity, using green as the primary accent across dark and light themes.

**Architecture:** Update the shared theme tokens and shared UI primitives first so the rest of the app can inherit a more coherent system. Keep routes and logic unchanged, then use home as the first reference surface and leave the rest of the app ready for follow-up screen passes.

**Tech Stack:** Expo Router, React Native, NativeWind, React Native Reanimated, shared theme/provider tokens.

---

## File Map

- Modify: `apps/mobile/constants/theme.ts`
- Modify: `apps/mobile/components/ui/hero/index.tsx`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/components/dashboard/AthleteDashboard.tsx`
- Modify: `apps/mobile/components/dashboard/GuardianDashboard.tsx`
- Modify: `apps/mobile/components/home/IntroVideoSection.tsx`
- Modify: `apps/mobile/components/home/AdminStorySection.tsx`
- Modify: `apps/mobile/components/home/TestimonialsSection.tsx`

## Task 1: Rebuild Theme Tokens

- [ ] Standardize dark mode around green primary + near-black background.
- [ ] Standardize light mode around green primary + white background.
- [ ] Tighten contrast, borders, surfaces, and accent usage to follow a 70 / 20 / 10 balance.
- [ ] Simplify typography defaults exposed through the theme.

## Task 2: Refactor Shared Primitives

- [ ] Update shared card, button, chip, and surface primitives to feel less decorative and more native.
- [ ] Reduce excessive rounding, shadow noise, and inconsistent border behavior.

## Task 3: Make Home The Reference Screen

- [ ] Keep the existing route and logic, but make home reflect the new visual system.
- [ ] Preserve content order while improving hierarchy, spacing, and quick actions.
- [ ] Keep motion subtle and product-like.

## Task 4: Align Supporting Home Content

- [ ] Update intro video, admin story, and testimonials so they share the same system and typography.
- [ ] Reduce low-value text and decorative noise.

## Task 5: Verify

- [ ] Run `pnpm --filter mobile typecheck`.
- [ ] Confirm no route or logic changes were introduced.

