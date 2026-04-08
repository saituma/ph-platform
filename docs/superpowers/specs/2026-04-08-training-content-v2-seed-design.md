# Training Content V2 Seed (Youth + Adult) Design

**Goal:** Create a destructive seed script that wipes training content and seeds fresh data for youth ages 7–18 and adult tiers, including modules, sessions, items, and “other” content with YouTube Shorts video links.

## Scope
- **Youth (ages 7–18):**
  - Each age gets **12 unique modules**
  - Each module has **5 sessions**
  - Each session has items with **random YouTube Shorts** video URLs
- **Adults (by tier):**
  - Tiers: `PHP`, `PHP_Premium`, `PHP_Premium_Plus`, `PHP_Pro`
  - Each tier gets **12 modules**
  - Each module has **5 sessions**
  - Tier locks set so modules/sessions unlock per tier
- **Other content (all types):**
  - Types: `warmup`, `cooldown`, `mobility`, `recovery`, `nutrition`, `inseason`, `offseason`, `education`
  - Seeded for **each age (7–18)** and **adult tier audiences**
- **Destructive wipe** of training content and related logs/completions.

## Data Model Targets
### Core training tables
- `training_modules`
- `training_module_sessions`
- `training_session_items`
- `training_module_tier_locks`
- `training_session_tier_locks`
- `training_audiences`

### Other training tables
- `training_other_contents`
- `training_other_settings`

### Completions/logs (wipe)
- `athlete_training_session_completions`
- `athlete_training_session_logs`
- `program_section_completions`

## Audience Labels
- **Youth:** `"7"` through `"18"` (exact age labels)
- **Adults:** `"19-99"` (range label)

## Seed Content Shape
### Modules
Each module includes:
- `title`: age/tier-specific name
- `order`: 1–12
- `audienceLabel`: age or `19-99`
- `createdBy`: admin/superAdmin

### Sessions (per module)
Each session includes:
- `title`: “Session X”
- `order`: 1–5
- `dayLength`: 7

### Session Items (per session)
Each session includes items:
- `blockType`: `main` (optionally mix in `warmup`/`cooldown` blocks if desired)
- `title`, `body`: age/tier-specific copy
- `videoUrl`: random YouTube Shorts
- `metadata`: includes sets/reps/restSeconds for realism
- `allowVideoUpload`: `false`

### Tier Locks
For adult tier audiences:
- `training_module_tier_locks`: start module = module 1 for each tier
- `training_session_tier_locks`: start session = session 1 for each tier

## Other Content (All Types)
For each type and each audience label:
- Create at least 1 item (use order = 1)
- Enable the type via `training_other_settings` for that audience label

## Destructive Wipe Order
1. `athlete_training_session_completions`
2. `athlete_training_session_logs`
3. `training_session_items`
4. `training_module_sessions`
5. `training_session_tier_locks`
6. `training_module_tier_locks`
7. `training_modules`
8. `training_other_contents`
9. `training_other_settings`
10. `training_audiences`
11. `program_section_completions`

## Script Location + Run
- New script: `apps/api/src/scripts/seed-training-v2.ts`
- Run:
  - `CONFIRM_SEED_TRAINING=yes pnpm --filter api seed:training`

## Validation
- Ensure an admin/superAdmin exists or fail with a clear error.
- Confirm destructive run via `CONFIRM_SEED_TRAINING=yes`.

## Testing (Manual)
- Run the seed script.
- Confirm:
  - 12 modules per age 7–18.
  - 12 modules per adult tier.
  - 5 sessions per module.
  - “Other” content exists for each type and audience label.
