# Mobile Home Team UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile home screen for team athletes so it feels more native, more athletic, and more coherent without changing routes or logic.

**Architecture:** Keep the existing home route and data hooks intact, but replace the mixed visual language with a tighter layout system. Concentrate changes in the home route, team-athlete dashboard block, and supporting home content cards so the screen reads as one product surface.

**Tech Stack:** Expo Router, React Native, NativeWind className usage, React Native Reanimated, existing app theme tokens.

---

## File Map

- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/components/dashboard/AthleteDashboard.tsx`
- Modify: `apps/mobile/components/dashboard/GuardianDashboard.tsx`
- Modify: `apps/mobile/components/home/IntroVideoSection.tsx`
- Modify: `apps/mobile/components/home/AdminStorySection.tsx`
- Modify: `apps/mobile/components/home/TestimonialsSection.tsx`

## Task 1: Rebuild Home Header And Quick Links

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] Tighten the hero header layout so welcome message and team identity feel compact and premium.
- [ ] Replace the current oversized quick-link cards with cleaner athletic action tiles that still use the same route pushes.
- [ ] Keep pull-to-refresh, avatar tap, and route behavior unchanged.

## Task 2: Redesign Team Athlete Progress Block

**Files:**
- Modify: `apps/mobile/components/dashboard/AthleteDashboard.tsx`

- [ ] Replace the current mixed "profile snapshot/live feed stats" treatment with a single clearer weekly-progress-first composition.
- [ ] Keep athlete loading, API calls, birthday logic, and displayed data unchanged.
- [ ] Improve scanability by reducing decoration and sharpening metric hierarchy.

## Task 3: Keep Guardian Dashboard Visually Compatible

**Files:**
- Modify: `apps/mobile/components/dashboard/GuardianDashboard.tsx`

- [ ] Bring the guardian block closer to the new home visual system so the app no longer feels inconsistent.
- [ ] Keep copy, routes, and existing metric values unchanged.

## Task 4: Redesign Supporting Home Content Cards

**Files:**
- Modify: `apps/mobile/components/home/IntroVideoSection.tsx`
- Modify: `apps/mobile/components/home/AdminStorySection.tsx`
- Modify: `apps/mobile/components/home/TestimonialsSection.tsx`

- [ ] Give the intro video a cleaner premium media-card presentation.
- [ ] Make the admin story more editorial and professional without changing content.
- [ ] Simplify testimonials so they feel like proof, not decorative noise.

## Task 5: Motion And Verification

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/components/dashboard/AthleteDashboard.tsx`
- Modify: `apps/mobile/components/dashboard/GuardianDashboard.tsx`

- [ ] Reduce overly theatrical motion and keep only subtle entrance/feedback motion.
- [ ] Run `pnpm --filter mobile typecheck`.
- [ ] Review for route safety and unchanged behavior.

