# Mobile Home Team UI Redesign

Date: 2026-04-24

Target: `apps/mobile`

## Goal

Redesign the mobile home screen for the team-athlete experience so it feels:

- Native to mobile
- Premium and athletic, closer to Strava-level clarity
- Strong on progress and control
- Visually unified instead of mixed or "vibecoded"

This is a UI/UX redesign only. Logic, routes, and existing content sources stay unchanged.

## Constraints

- Do not change navigation or route structure
- Do not change business logic
- Do not change content order requested by the user
- Keep the redesign implementation focused on the home screen first
- Motion should be subtle, purposeful, and performance-safe

## Primary Audience

First optimization target:

- Team athlete

Other roles can keep existing behavior for now, but the visual direction should be reusable later.

## Success Criteria

The redesigned home should:

- Feel like one coherent product surface
- Prioritize weekly progress and next actions
- Use more native-feeling mobile composition and controls
- Reduce visual noise and inconsistent card treatments
- Improve scanability within the first screenful

## Content Order

Preserve this order:

1. Welcome message
2. Team name
3. Quick links
4. Weekly run status
5. Intro video
6. Professional admin photo and story
7. Testimonials

## Chosen Direction

Chosen direction: hero-first performance home

Why:

- Best match for "progress and control"
- Gives team identity at the top without turning the screen into a marketing page
- Keeps quick links and weekly progress above the fold
- Leaves richer storytelling content lower on the screen where it supports, rather than competes with, core utility

## UX Structure

### 1. Welcome and Team Header

The top section should be compact, premium, and calm:

- Strong welcome headline
- Team name as a secondary line
- Minimal supporting copy only when content exists
- No oversized decorative hero treatment
- No mixed dashboard plus marketing visual language

Purpose:

- Immediate orientation
- Team identity
- A clean start that does not waste vertical space

### 2. Quick Links

Quick links should become the primary control layer:

- Larger, cleaner tap targets
- Simpler labels
- Consistent icon sizing
- Fewer decorative treatments
- Balanced spacing and native-feeling pressed states

Purpose:

- Make the screen useful immediately
- Support "control" without looking like generic feature cards

### 3. Weekly Run Status

This is the main progress block:

- One dominant weekly progress metric
- Two or three smaller supporting stats
- Cleaner hierarchy than the current dashboard-style treatment
- Easier comparison and faster scanning

Purpose:

- Make "progress" the visual center of the home experience
- Give athletes a clear sense of where they stand this week

### 4. Intro Video

The intro video should feel like a premium media card:

- Cleaner frame
- Stronger visual hierarchy
- Less ornamental chrome
- Clear action area without oversized marketing cues

Purpose:

- Keep rich content attractive without disrupting the main dashboard rhythm

### 5. Admin Photo and Story

The admin story section should feel editorial but still mobile-native:

- Photo-led composition
- Shorter, cleaner text layout
- More trust and professionalism
- Less "promo panel" energy

Purpose:

- Reinforce credibility and personality
- Add human context without overwhelming the home screen

### 6. Testimonials

Testimonials should become quieter proof:

- Cleaner grouping
- Less visual competition
- Easier reading rhythm
- Clear separation from admin story content

Purpose:

- Support trust and credibility
- Avoid turning the lower half of home into a noisy landing page

## Visual Language

### Overall Style

The redesign should feel:

- Native
- Athletic
- Premium
- Controlled

Not:

- Overly glassy
- Overly decorative
- Randomly experimental
- Marketing-site-like

### Composition Rules

- Use tighter vertical rhythm
- Reduce oversized panels
- Standardize corner radii by component class
- Reduce competing shadows, glows, and accent treatments
- Use spacing and contrast for hierarchy before using decoration

### Typography

- Keep hierarchy strong and readable
- Use one clear title style, one card-title style, one body style, one small-label style
- Avoid abrupt style changes across adjacent sections

### Color

- Keep the current athletic accent system, but apply it more selectively
- Use accent color to guide actions and highlight progress
- Avoid making every block compete for attention

## Motion

Motion should be subtle and native-feeling:

- Short entrance fades/slides only where they reinforce hierarchy
- Pressed states should feel responsive and consistent
- Avoid loud reveal patterns and over-staggered animation
- Keep animation lightweight and reusable

## Implementation Boundaries

Expected files are likely to include:

- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/components/dashboard/AthleteDashboard.tsx`
- `apps/mobile/components/dashboard/GuardianDashboard.tsx`
- Related home sections only if needed for visual consistency

The redesign should avoid unnecessary refactors outside the home surface.

## Testing and Verification

Verify:

- Home layout still loads with existing data sources
- Routes and interactions still behave the same
- Pull-to-refresh still works
- Motion does not interfere with scrolling or interaction
- Team-athlete home feels visually consistent from top to bottom

## Non-Goals

- No route changes
- No new features
- No content-model changes
- No backend changes
- No redesign of the entire app in this iteration

