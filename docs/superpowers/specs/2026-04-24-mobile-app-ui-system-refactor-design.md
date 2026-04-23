# Mobile App UI System Refactor

Date: 2026-04-24

Target: `apps/mobile`

## Goal

Refactor the mobile app UI system so the app feels:

- Native
- Clean
- Premium
- Coherent across screens
- Closer to strong consumer app quality, with Instagram-like cleanliness and Strava-like athletic purpose

This is an app-wide UI refactor. It should improve visual consistency, typography, color usage, contrast, and motion without changing app logic or routes.

## User Intent

The user wants the app to stop feeling:

- Vibecoded
- Visually inconsistent
- Overwritten with unnecessary text
- Weak in contrast and color discipline
- Unsatisfying as a first impression for a new user

The user specifically asked for:

- Dark mode with green primary + black background
- Light mode with green primary + white background
- 70 / 20 / 10 color balance
- Better typography
- More natural, native-feeling UX
- Less nonsense text
- Better full-app visual consistency

## Constraints

- Do not change logic
- Do not change routes
- Do not change backend behavior
- Keep the refactor UI-only
- Do not introduce decorative motion that feels showy or unstable

## Product Direction

### Chosen Design Blend

Primary visual influence:

- Instagram-clean

Secondary product behavior influence:

- Strava-purposeful

This means:

- Clean spacing, cleaner content rhythm, calmer surfaces
- Athletic emphasis where the product needs progress, activity, and action clarity
- No random visual mixing between marketing-style cards, dashboard-style tiles, and glassy decorative hero sections

## System Principles

### 1. Visual Coherence

The app must feel like one system, not many individually styled screens.

To achieve that:

- Shared tokens must drive most color and surface decisions
- Shared component patterns must be reused across features
- Typography must use a smaller, stricter hierarchy
- Accent color must be intentional, not everywhere

### 2. Native-Feeling UX

The app should feel mobile-native by:

- Using clearer tap targets
- Simplifying action rows
- Reducing card-in-card layering
- Using calmer headers and modal layouts
- Keeping screen structures easy to scan

### 3. Stronger First Impression

A new user opening the app should feel:

- Oriented
- Confident
- Interested
- Clear on what matters

Not:

- Overwhelmed
- Distracted
- Unsure which blocks matter
- Distrustful of the quality of the product

## Color System

### Palette Model

#### Dark Mode

- Base background: black / near-black
- Main surfaces: charcoal / deep neutral
- Support surfaces: slightly lifted gray-green / neutral dark layers
- Accent: green only for action, progress, selection, and success
- Primary text: white
- Secondary text: muted gray

#### Light Mode

- Base background: white
- Main surfaces: white and soft neutral cards
- Support surfaces: light gray / soft green-tinted neutral only where needed
- Accent: same green family
- Primary text: dark charcoal
- Secondary text: medium neutral gray

### 70 / 20 / 10 Application

- 70% neutral base surfaces and background
- 20% support tones for cards, dividers, elevated areas, muted fills
- 10% green accent for primary actions, active states, progress, and status

Rules:

- Green should never become the main background language of the whole app
- Most screens should read neutral first, accent second
- Accent should guide the eye rather than dominate the screen

### Color Cleanup

The refactor should remove unnecessary one-off colors except where a semantic state is required:

- success
- warning
- danger
- info if genuinely needed

## Typography System

### Intent

Typography should become more disciplined and readable.

### Rules

- Reduce the number of visual type modes in normal app screens
- Keep decorative fonts only for rare high-level emphasis
- Use simpler, more consistent hierarchy in dense UI
- Prefer clarity over novelty

### Structure

The app should standardize around:

- One screen-title style
- One section-title style
- One card-title style
- One body style
- One meta / caption style

### Copy Rules

- Remove redundant helper copy
- Avoid overexplaining obvious UI
- Shorten labels and section intros
- Prefer app-like text over landing-page text

## Shared Component System

The visual system refactor must standardize these shared patterns:

- cards
- buttons
- chips / pills
- section headers
- icon containers
- list rows
- text inputs
- sheets and modals
- empty states
- quick-link tiles

### Card Rules

- Fewer oversized radii
- Cleaner edge treatment
- Less stacking of multiple nested borders
- Less ornamental chrome
- More consistent internal spacing

### Button Rules

- Larger, clearer hit areas
- Fewer custom treatments per screen
- Accent reserved for primary action
- Secondary actions should use restraint

### Input Rules

- Inputs should look simpler and more native
- Reduce decorative wrappers and unnecessary labels
- Sheets should have cleaner action hierarchy

## Navigation Chrome

### Headers

Headers should be calmer and more consistent:

- less repeated hero-card treatment
- more stable safe-area spacing
- simpler title and action alignment

### Tab Bar

The tab bar should feel less custom-noisy and more product-level polished:

- consistent icon emphasis
- clearer active state
- better balance with the rest of the app chrome

## Motion

Motion should be:

- subtle
- native-feeling
- fast
- purposeful

Allowed motion patterns:

- short fades
- short upward/downward entrance motion
- press feedback
- small state transitions

Avoid:

- loud hero reveals
- over-staggering
- animation used as decoration

## Refactor Order

Implementation should proceed in this order:

1. theme tokens
2. typography scale
3. shared surfaces and buttons
4. navigation chrome
5. home as the reference screen
6. key feature surfaces:
   - tracking
   - team/social
   - messages
   - profile / more

This order matters because screen polish without shared-system cleanup will recreate inconsistency.

## Screen Strategy

### First Reference Surface

The first full reference screen should be home.

Why:

- It sets first impression
- It exposes most of the current inconsistency
- It contains both utility and supporting content

### Follow-Up Surfaces

After home, the next major screens should be refactored through the same system, not redesigned independently.

## Testing and Verification

Verify:

- dark and light modes both follow the new palette logic
- accent usage stays restrained
- contrast improves for primary and secondary text
- home feels visually coherent
- routes and logic remain unchanged
- major shared UI patterns feel consistent after refactor

## Non-Goals

- No feature redesign at the logic level
- No route restructuring
- No backend changes
- No copywriting overhaul beyond removing low-value UI text
- No full brand redesign outside the mobile product UI system

