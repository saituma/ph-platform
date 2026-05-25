# PH Performance — Master Process & Launch Playbook

> Single source of truth for how the PH Performance system works end-to-end.
> Refer back to this any time you need to understand signup, payments, tiers,
> team setup, or access control.
>
> Last deep audit: pre-launch, before 2026-05-26 12:00 BST.

---

## 0. Launch-eve fixes applied (read this first)

**Two audit passes ran.** Six launch-blocking bugs were found and **fixed**:

| # | Bug | Fix | File |
|---|---|---|---|
| 1 | **RevenueCat dead-stub endpoint still exposed.** Returned 503 on any iOS in-app purchase attempt. | Deleted controller, removed route + export + test mocks. iOS uses Stripe web checkout exclusively. | `controllers/billing/revenuecat.controller.ts` (deleted), `billing/index.ts`, `routes/billing.routes.ts`, e2e test mocks |
| 2 | **Team approval did NOT grant tier to athletes.** Coach paid → team active → athletes still `currentProgramTier = null` → no app access. Every team signup affected. | Team approval now writes `currentProgramTier`, `currentPlanId`, `planExpiresAt` to every team athlete whose tier is NULL (preserves admin overrides). | `services/billing/team-request.service.ts:approveTeamSubscriptionRequest` |
| 3 | **Expiry cron destroyed team athletes after one billing cycle.** Renewal webhook only extended `teamTable.planExpiresAt`, never athlete row. Cron then nuked them — even overridden ones. | Cron joins `teamTable` and skips athletes whose team is `subscriptionStatus=active` OR `planExpiresAt > now`. | `services/subscription-expiry.service.ts:processExpiredPlans` |
| 4 | **Athletes attached AFTER team approval had no tier.** `attachAthleteToTeamAdmin` only set tier for sponsored athletes. Non-sponsored athletes joining an active team had `currentProgramTier=null` → locked out. | Non-sponsored attach to an active team (`subscriptionStatus=active` OR `planExpiresAt > now`) now inherits the team's base tier + expiry. | `services/admin/team.service.ts:attachAthleteToTeamAdmin` |
| 5 | **Guardian tier not synced on team approval.** Youth athletes' parents kept stale tier → parent platform access broken on team signup. | Team approval now mirrors the granted tier to `guardianTable` for every athlete that received the grant. | `services/billing/team-request.service.ts` |
| 6 | **Reminder cron emailed team athletes "your plan expires in 7 days"** even when team subscription was renewing fine. Would have caused mass support spam. | Same team-active filter as the expired cron now applies to `processExpiringReminders`. | `services/subscription-expiry.service.ts:processExpiringReminders` |

**Second audit also raised false positives — verified and rejected:**
- "ALLOW_JWT_BYPASS lets fake tokens through" → False. Guarded by `nodeEnv !== "production"` at `auth.ts:78`. Off in prod.
- "`x-acting-user-id` header is an IDOR" → False. `auth.ts:126-136` checks `listGuardianAthletes` ownership before switching identity.
- "Socket `group:join` lets users subscribe to any room" → False. `socket.ts:481` calls `isGroupMember(groupId, userId)` before joining.

API typecheck clean, lint clean on edited files, 313/316 tests pass (3 failures are pre-existing DB SSL setup issues in `video.controller.test.ts`, unrelated to these changes).

---

## 1. The Four Tiers (canonical)

**Source of truth:** `TIER_DEFAULT_FEATURES` in `packages/billing/src/index.ts:147`. DB enum is `program_type` in `apps/api/src/db/schema.ts:30`.

### What each tier actually gates in code

| Tier | Code feature flags (exact) |
|---|---|
| **PHP Program** (`PHP`) | coach_module, messaging, schedule, mobile_app, progress_tracking, referrals, bookings |
| **PHP Premium** (`PHP_Premium`) | All of PHP + parent_platform, nutrition_logging, food_diaries, parent_education, submit_diary |
| **PHP Premium Plus** (`PHP_Premium_Plus`) | All of Premium + video_upload, semi_private, warmup_cooldown, mobility_recovery |
| **PHP Pro** (`PHP_Pro`) | All of Plus + physio_referrals, programs_full, priority_messaging, faster_turnaround, periodization, competition_windows, one_on_one_review, bespoke_progression, in_season, off_season, movement_screening, stretching_foam, social_feed, run_tracking, achievements |

### ⚠ Heads up — Plus vs Premium are NOT identical in code

You stated:
> "PHP Premium Plus = EXACT same app access as Premium, but includes in-person semi-private sessions."

The code does not match that. Plus currently has 4 extra in-app features beyond Premium: **video_upload, semi_private, warmup_cooldown, mobility_recovery**. The `semi_private` is fine (that's the in-person feature). The other three are extra in-app gating Premium users don't get.

**Two options — your call:**
1. If you meant "Plus = Premium app-wise, only in-person differs", we need to **move video_upload, warmup_cooldown, mobility_recovery into Premium** and update the pricing copy on `apps/onboarding/src/routes/onboarding/step-5.tsx` (which currently advertises "video upload for coach response" as Plus-only).
2. If you actually want Plus to gate those three extra features in-app, no code change — just update your description. The onboarding pricing card already reflects this.

This is a business decision you have to make; I didn't touch the feature lists.

### What Pro gets above Plus

Code adds physio referrals, full periodization, priority messaging, faster turnaround, etc. The "1:1 in-person coaching" itself is offline and not in feature flags. Same caveat as Plus — copy and code diverge a little.

---

## 2. End-to-End Flow: Signup → Access

### 2.1 Individual athlete (fully automated)

```
1. apps/onboarding /register
   • Email + Turnstile CAPTCHA (skipped if VITE_TURNSTILE_SITE_KEY unset → see §8)
   • POST /api/auth/register/start → 6-digit email code

2. /verification
   • Code entered → POST /api/auth/confirm → auth token stored

3. /onboarding/step-1 → step-2 → step-3 → step-3b → step-4a → step-4 → step-5
   • step-1: account type (youth/adult/team) + password
   • step-2: profile / DOB (youth flow requires parent details)
   • step-3: training goals, equipment, phone (validated digits-only)
   • step-3b: PAR-Q health form + emergency contact (REQUIRED)
   • step-4a: T&Cs, privacy, waiver, nutrition, cancellation, media consent.
     Parent consent required if user is under 18 (age computed from DOB).
   • step-4: review summary
   • step-5: plan picker (all 4 tiers, all billing cycles, proration shown)

4. Stripe Checkout
   Session metadata for athlete: { planId, userId, athleteId, planBillingCycle }
   User pays.

5. Webhook: checkout.session.completed
   apps/api/src/controllers/billing/webhook.controller.ts:278
   → updateRequestFromStripeSession() creates subscriptionRequest row

6. Admin approves (or auto-approves) → athleteTable.currentProgramTier is set
   request.service.ts:812 — the ACTUAL line that sets tier.

7. /payment-success → /onboarding/success
   Calls /api/billing/confirm ONCE to surface the receipt.
   ⚠ Not a polling page — see §8 risk #2.

8. Mobile / web portal access reflects currentProgramTier immediately.
```

### 2.2 Team (manual admin approval — by design)

```
1–4. Same as athlete except step-4b runs between step-4 and step-5:
     step-4b collects team payment mode (coach pays all / players pay each /
     coach sponsors selected players) and player emails.

5. Stripe Checkout (team-flavoured)
   Session metadata: { teamId, adminId, type: "team_subscription", planId,
                       billingCycle, paymentMode, coachPaysSeats, termsAcceptedAt }

6. Webhook: checkout.session.completed (type=team_subscription)
   → upsertTeamPendingApprovalFromSessionMetadata()
   → Creates teamSubscriptionRequestTable row in status: pending_approval
   ⚠ NO tier granted yet. Coach + athletes are in a holding state.

7. Admin approves in apps/web → POST /admin/team-subscription-requests/:id/approve
   → approveTeamSubscriptionRequest() in team-request.service.ts:330
     • Marks request status=approved
     • Sets team.planId, subscriptionStatus=active, planExpiresAt
     • ✅ NEW: Now also updates every team athlete with currentProgramTier=NULL
       to grant them the plan's tier (athletes who were overridden by admin
       are preserved).

8. Coach + athletes now have access.
```

> **Ops note:** A team request stuck in `pending_approval` is the #1 thing to
> watch on launch day. Have someone refreshing the admin queue.

### 2.3 Team player invite (each player pays their own seat)

```
1. Coach selects "All players pay" or "Selected players pay" in step-4b.
2. Server emits a teamPlayerPaymentInvite row per player email.
3. Each player receives an email with a tokenised checkout link.
4. Player completes Stripe Checkout. Webhook updates the invite to status=paid.
5. Once all required invites are paid AND coach's portion is paid,
   the request is auto-eligible for approval.
```

---

## 3. Team flexibility: pay one tier, get another (admin override)

This works two ways. The first is at team-creation time; the second is per-athlete after the fact.

### A. Team-wide override at creation
`apps/web/app/users/add-team/page.tsx` — admin form exposes:
- `tier` (what's billed)
- `hasSponsoredPlayers`, `sponsoredPlayerCount`, `sponsoredTier` (override applied to specific athletes when attached)

When `isSponsored=true` athletes are attached, `attachAthleteToTeamAdmin` writes the **sponsored** plan's tier into `currentProgramTier` (`apps/api/src/services/admin/team.service.ts:1194`).

### B. Per-athlete tier override after the fact
- **UI:** `apps/web/app/teams/[teamName]/members/[athleteId]/page.tsx:440` — dropdown of `["", "PHP", "PHP_Premium", "PHP_Premium_Plus", "PHP_Pro"]`. PATCH-es `/api/backend/admin/teams/:teamName/members/:athleteId`.
- **Generic endpoint:** `POST /admin/users/program-tier` works for any user (team or individual).

### How overrides survive renewals (since the fix)
- Tier is decoupled from payment in the DB.
- The expiry cron now respects active teams — it will not nuke an overridden athlete on a team whose subscription is active.
- Admin overrides set `currentProgramTier` to a non-null value, so the team-approval grant logic skips them on the next approve cycle.

### ⚠ Still missing (post-launch wishlist)
- No UI label "Paid tier: X | Active tier: Y (overridden)". An overridden athlete looks identical to a normally-active one in the team members list. Plan to add this so admins don't lose track.
- No team-wide bulk upgrade button. If admin wants to upgrade all 12 athletes on a team to Premium without changing the billing tier, it's currently 12 separate PATCH calls (or 12 form saves).

---

## 4. Access Control / Gating

**Single source of truth:** `athleteTable.currentProgramTier`.

| Layer | How it's enforced |
|---|---|
| API | Every protected endpoint reads `currentProgramTier`, compares against required tier or feature key. Example: `apps/api/src/controllers/program-section.controller.ts`. Programs are filtered by `userId` server-side — athletes only see programs they're assigned to (verified). |
| Mobile | `apps/mobile/lib/planAccess.ts` — `canAccessTier(userTier, requiredTier)` uses tier rank `PHP < Premium < Plus < Pro`. Helpers `hasPremiumPlanFeatures` / `hasPhpPlusPlanFeatures` / `hasPhpProFeatures`. Tabs/screens hide themselves accordingly. Schedule tab filters semi-private bookings via `capabilities.semiPrivateBooking`. |
| Web admin | Admin role bypasses gating entirely. |

No gating gaps were found in the audit. If you add a new feature, gate it **both** server-side (read `currentProgramTier`) and client-side (use `planAccess.ts`).

---

## 5. Stripe Integration — what's verified, what isn't

### Verified working

| Item | File:Line |
|---|---|
| Webhook signature verification | `webhook.controller.ts:292` — throws on invalid sig, returns 400 (Stripe doesn't retry). |
| Webhook config guard | Returns 500 if `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` missing. |
| `checkout.session.completed` (athlete) | `updateRequestFromStripeSession` → status pending_approval. Tier set at approval (line 812). |
| `checkout.session.completed` (team) | `upsertTeamPendingApprovalFromSessionMetadata` → status pending_approval. Admin must approve. |
| `checkout.session.async_payment_succeeded` / `_failed` / `expired` | Handled. |
| `invoice.payment_succeeded` | Extends `planExpiresAt` (athletes for individual, team for team subs). |
| `invoice.payment_failed` (athlete) | Revokes access instantly + sends email. |
| `customer.subscription.deleted` | Cancels request, clears athlete tier (individual), clears team plan (team). |
| Idempotency (athlete) | `request.service.ts:540-542` — skip if already approved. |
| Idempotency (team) | `onConflictDoNothing()` on `stripeSessionId` at insert. |
| Mounted endpoints | `/api/billing/webhook` and `/api/v1/billing/webhook` (apps/api/src/app.ts:125-126). |

### Known gaps (NOT fixed tonight — operational workarounds)

| Gap | Severity | Workaround until fixed |
|---|---|---|
| **No `customer.subscription.updated` handler.** If a customer changes plan via the Stripe Billing Portal, the new tier is never reflected. | MEDIUM | Disable plan-change in Customer Portal settings on the Stripe dashboard, OR have admins handle tier changes manually. |
| **`invoice.payment_failed` on a team** marks `paymentStatus: past_due` but does NOT revoke athlete access (unlike individual). | MEDIUM | Watch the past_due queue manually; revoke via admin UI if dunning fails. |
| **No grace period** on individual `invoice.payment_failed` — access killed instantly. A transient processor failure can lock out a paying customer. | LOW | Document this for support; manual re-grant via admin tier override if it happens. |
| **Webhook errors return HTTP 500** which triggers Stripe to retry indefinitely. A FK constraint or missing plan can orphan rows. | LOW (no incidents observed) | Monitor Stripe dashboard → Events → failed delivery rate. |

### Env vars required for Stripe

```
STRIPE_SECRET_KEY           (sk_live_… or sk_test_…)
STRIPE_PUBLISHABLE_KEY      (pk_live_… or pk_test_…)
STRIPE_WEBHOOK_SECRET       (whsec_…) ← REQUIRED in prod
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
STRIPE_PRICE_PHP
STRIPE_PRICE_PHP_PREMIUM
STRIPE_PRICE_PHP_PLUS
STRIPE_PRICE_PHP_PRO
```
Validated in `apps/api/src/config/env.ts`. Set these in Render env before launch.

---

## 6. Pre-launch Verification Checklist (run before 12:00 PM BST)

### Environment & infra
- [ ] All Stripe env vars above set in Render API project (live mode keys)
- [ ] `VITE_TURNSTILE_SITE_KEY` set in onboarding env (otherwise CAPTCHA is bypassed)
- [ ] Stripe webhook endpoint URL added in Stripe dashboard and signing secret matches `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook delivery from Stripe dashboard → "Send test event" → confirm 200 in API logs

### Signup (run twice — once as adult, once as youth)
- [ ] Register fresh email → receive verification code → enter → land on step-1
- [ ] Walk every step → confirm validation messages appear when required fields blank
- [ ] T&Cs checkboxes block continue if not checked
- [ ] Youth flow asks for parent consent when DOB < 18

### Payment (run for each tier: PHP, Premium, Plus, Pro)
- [ ] Use Stripe test card `4242 4242 4242 4242` → confirm checkout completes
- [ ] Verify `subscriptionRequestTable` row created with planId set
- [ ] After approval, verify `athleteTable.currentProgramTier` = paid tier
- [ ] Use failure card `4000 0000 0000 0341` → confirm access revoked + email sent

### Tier gating (the big one — your "no users get content outside their tier")
- [ ] Log in mobile as PHP Program user → confirm parent platform / nutrition / video / semi-private all hidden
- [ ] Log in mobile as Premium user → confirm parent platform + nutrition visible, video / semi-private hidden (per current code)
- [ ] Log in mobile as Plus user → confirm video upload + semi-private booking + warmup/mobility libraries visible
- [ ] Log in mobile as Pro user → confirm priority messaging + full programs
- [ ] Try hitting a Pro-only API endpoint as a Premium user → confirm 403

### Team setup (use the NEW tier-grant fix)
- [ ] Create team in apps/web with tier=PHP_Program, sponsoredTier=PHP_Premium
- [ ] Add 2 sponsored athletes → confirm they get currentProgramTier=PHP_Premium
- [ ] Submit team subscription via onboarding → confirm it lands in pending_approval
- [ ] Admin approves → confirm:
  - Team marked subscriptionStatus=active
  - Sponsored athletes still have PHP_Premium (not overwritten — verify the override survived)
  - Non-sponsored team athletes now have currentProgramTier=PHP_Program (newly granted by the fix)
- [ ] Manually PATCH one non-sponsored athlete to PHP_Premium → confirm dropdown saves
- [ ] Force-expire the team's planExpiresAt to a past date in DB → run the expiry cron → confirm overridden athletes are NOT cleared (the fix)

### Onboarding forms (these MUST work)
- [ ] T&Cs accept stored with version tag `2025-05-01`
- [ ] PAR-Q answers all stored
- [ ] Emergency contact name + phone + relationship required
- [ ] Parent consent stored for youth athletes

### Admin dashboard
- [ ] Sidebar shows: Users, Teams, Plans/Tiers, Chat, Programs, Schedule, Nutrition, Pending Approvals
- [ ] Pending Approvals page shows team subscription requests in pending_approval status
- [ ] Approve button works and grants tier (verify via DB or by logging in as athlete)
- [ ] Individual user edit page shows tier dropdown and saves

### Mobile polish — Premium tier (this is what MOST users will see)
- [ ] All 5 tabs render (Home, Programs, Schedule, Messages, More) with no crashes
- [ ] "No programs assigned" empty state shows gracefully when applicable
- [ ] Programs filter — confirm athlete only sees assigned programs (the API already filters by userId, verified)
- [ ] Schedule tab shows public bookings; semi-private hidden for Premium
- [ ] Push notifications work — send test from admin → confirm received

### Launch-day staffing
- [ ] Person watching admin "Pending Approvals" queue continuously
- [ ] Person watching Stripe dashboard → Events → for failed webhook deliveries
- [ ] Comms ready for the "stuck on success page" edge case (see §8 risk 2)

---

## 7. Where things live — quick reference

| Concern | File / Path |
|---|---|
| Tier definitions | `packages/billing/src/index.ts:147` |
| DB schema (athlete tier) | `apps/api/src/db/schema.ts:255` (`athleteTable.currentProgramTier`) |
| Tier enum | `apps/api/src/db/schema.ts:30` (`ProgramType`) |
| Signup start | `apps/onboarding/src/routes/register.tsx` |
| Onboarding steps | `apps/onboarding/src/routes/onboarding/step-*.tsx` |
| Plan picker | `apps/onboarding/src/routes/onboarding/step-5.tsx` |
| Payment success | `apps/onboarding/src/routes/onboarding/success.tsx` |
| Stripe webhook | `apps/api/src/controllers/billing/webhook.controller.ts:278` |
| Billing routes | `apps/api/src/routes/billing.routes.ts` |
| Team approval (with tier-grant fix) | `apps/api/src/services/billing/team-request.service.ts:330` |
| Athlete attach to team | `apps/api/src/services/admin/team.service.ts:1115` |
| Admin tier override | `apps/api/src/controllers/admin/user.controller.ts:256` |
| Expiry cron (with team-preserving fix) | `apps/api/src/services/subscription-expiry.service.ts:22` |
| Mobile tier gating | `apps/mobile/lib/planAccess.ts` |
| Admin team form | `apps/web/app/users/add-team/page.tsx` |
| Admin team member edit | `apps/web/app/teams/[teamName]/members/[athleteId]/page.tsx:440` |
| Pending approvals UI | `apps/web/components/admin/billing/pending-approvals-manager.tsx:218` |

---

## 8. Open risks (read before launch)

### 🔴 MUST VERIFY before going live
These are in your local `apps/api/.env` and need to be **different in Render production env**. Check now:

| Env var | Local value | Required in prod |
|---|---|---|
| `STRIPE_SUCCESS_URL` | `localhost:5173/payment-success` (no `http://`, points to localhost) | Full HTTPS URL of your prod onboarding domain, e.g. `https://onboarding.phperformance.uk/payment-success` |
| `STRIPE_CANCEL_URL` | `localhost:5173/payment-cancel` | Full HTTPS URL of your prod onboarding domain |
| `STRIPE_PRICE_PHP*` (4 vars) | `price_1TN…` IDs — look like test-mode | Confirm these are **live-mode** price IDs (`sk_live_…` Stripe key resolves them) or replace with live IDs |
| `ADMIN_WEB_URL` | `http://localhost:3000` | Production admin URL |
| Mobile `EXPO_PUBLIC_API_BASE_URL` | `apps/mobile/app.config.js:26-28` hard-codes Heroku staging URL as fallback | Must be set via EAS env or `.env` to the live API URL; otherwise prod app builds point at staging |

**If the prod-side Render env already has correct values**, none of the above is a problem — they only matter if Render is reading from this local `.env`. Open the Render dashboard → API service → Environment, and confirm each is set correctly.

### 🟡 Operational risks (no code fix tonight)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Turnstile CAPTCHA bypassed when env var unset.** `apps/onboarding/src/routes/register.tsx:89` only enforces if `VITE_TURNSTILE_SITE_KEY` exists. | HIGH | Confirm env var set in production onboarding deployment. |
| 2 | **Success page is single-shot, not polling.** If Stripe webhook is slow, user lands on `/onboarding/success` and sees no tier change. | HIGH | Have support ready for "I paid but no access" — admin can manually approve from the request queue. |
| 3 | **Tier copy mismatch.** Onboarding step-5 advertises video upload as Plus-only. Per code: Plus has 4 extra in-app features vs Premium (video_upload, semi_private, warmup_cooldown, mobility_recovery). | MEDIUM | Either match copy to code, or move 3 features into Premium and update copy. Business decision — see §1. |
| 4 | **Team payment failure leaves athletes with access.** Only individual flow revokes on `invoice.payment_failed`. | MEDIUM | Watch dunning manually for the first month. |
| 5 | **No Stripe `customer.subscription.updated` handler.** Plan upgrades via Customer Portal silently lost. | MEDIUM | Disable plan-change in Stripe Customer Portal settings (Stripe dashboard → Customer Portal → Subscriptions → uncheck "Customers can switch plans"). |
| 6 | **No team-wide bulk tier override UI.** Admin must edit each athlete individually. | LOW | One-by-one for now. |
| 7 | **No paid-tier vs active-tier indicator** in admin UI for overridden athletes. | LOW | Track overrides off-system until UI lands. |
| 8 | **Admin Bookings/Nutrition pages exist but functionality wasn't fully verified.** UI present at `apps/web/app/bookings/page.tsx` and `apps/web/app/nutrition/page.tsx`. | LOW | Smoke-test these pages in admin before launch. |
| 9 | **User management lacks inline tier override.** Tier change is via dialog only (`setActiveDialog("assign-program")`), not inline on `/users`. | LOW | Use per-athlete edit page under Teams instead. |

---

## 9. Common scenarios — what to do

**"A team paid PHP Program but I want them on Premium."**
→ apps/web → Teams → [team] → each athlete → edit → currentProgramTier=PHP_Premium → Save. Payment is untouched.

**"This athlete is on the wrong tier."**
→ apps/web → Users → [athlete] → change tier dropdown. Or POST `/admin/users/program-tier`. Effect is immediate.

**"User paid but doesn't see new features."**
→ Check `subscriptionRequestTable.status`. If `pending_approval`, approve it in the pending queue. If `paid` but tier not set, replay the Stripe webhook from the dashboard (idempotency guard makes this safe).

**"User churned but still has access."**
→ Confirm `customer.subscription.deleted` webhook fired (Stripe dashboard → Events). If it did, check `athleteTable.currentProgramTier` — if non-null, the admin overrode them. Override via admin UI to revoke if intended.

**"Team athlete lost access after one month."**
→ With the expiry cron fix, this shouldn't happen if the team's subscription is still active. If it does, check `teamTable.subscriptionStatus` — it should be "active" and `planExpiresAt` should be in the future. If both true and athlete still lost access, the renewal webhook didn't fire — replay it.

**"Coach can't be approved — invite emails still sending."**
→ This is the `inviteEmailsReady` flag (team-request.service.ts:345). The "All players pay" / "Selected players pay" modes block approval until invite emails are delivered. Wait 2-3 minutes, or check `teamPlayerPaymentInviteTable.emailLastError`.

**"Plus and Premium look the same to my users."**
→ Per the current code, the only in-app differences are video upload, semi-private booking, warmup/cooldown library, and mobility/recovery library. If your marketing claims more, see §1 — code or copy needs to change.

---

_Verified against the codebase prior to 2026-05-26 12:00 BST. Three bug fixes
applied in this audit (see §0). API typecheck passes._
