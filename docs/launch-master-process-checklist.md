# PH Performance Launch Master Process & Checklist

Use this as the launch reference for signup, onboarding, payments, access levels, team setup, and final QA.

## Tier Rules

| Tier | App access | In-person/session inclusion | Notes |
| --- | --- | --- | --- |
| PHP Program | Restricted access | None included by default | Entry plan. Keep premium content, video upload, nutrition, physio, and social features locked unless manually overridden. |
| PHP Premium | Full app access | None included by default | Main tier. This should be the most polished and heavily tested path. |
| PHP Premium Plus | Same full app access as Premium | Includes in-person semi-private sessions | App access must not exceed or differ from Premium except session entitlement/positioning. |
| PHP Pro | Same full app access as Premium | Includes 1:1 in-person sessions | App access must not exceed or differ from Premium except session entitlement/positioning. |

## Source Of Truth

Payments and app access are intentionally separate.

| Concern | Source of truth | What it controls |
| --- | --- | --- |
| Paid plan | `currentPlanId` / subscription plan / Stripe request | What the user or team paid for, payment status, expiry, renewal, receipts. |
| App access override | `currentProgramTier` | What tier of app/content access the user receives. |
| Effective features | Paid plan features + manual tier override | Final feature access returned to the app. |
| Team billing | Team subscription request + team `planId` | Team payment queue, manager/player payment mode, approval state. |
| Team member access | Each athlete member `currentProgramTier` | Allows per-player overrides even when the team pays a lower plan. |

Example: a team pays the PHP Program price, but an admin sets team members to PHP Premium. The payment record remains PHP Program, while app access resolves as Premium.

## Signup To Access Flow

1. User starts signup from onboarding web.
2. User completes account details and required onboarding forms.
3. User chooses a package on plan selection.
4. User accepts terms, privacy, and agreements.
5. Stripe checkout is created for the selected billing cycle.
6. Stripe payment succeeds and webhook/payment sync marks payment as paid.
7. Admin approves the subscription request.
8. Backend assigns paid plan, access tier, expiry, and marks onboarding complete.
9. User logs into portal/mobile.
10. `/api/auth/me` returns tier, plan features, and capabilities.
11. UI navigation and API feature gates use those capabilities to hide or block unavailable features.

## Individual User QA

- [ ] Register a new adult user from start to finish.
- [ ] Register a new youth/guardian user from start to finish.
- [ ] Confirm required onboarding fields validate correctly.
- [ ] Confirm terms/privacy/agreement checkbox blocks checkout until accepted.
- [ ] Complete Stripe checkout for PHP Premium.
- [ ] Confirm payment request moves from pending payment to pending approval/approved.
- [ ] Confirm approved user can access dashboard, programs, schedule, messaging, nutrition, video upload, tracking, physio/referral areas expected for Premium.
- [ ] Confirm PHP Program user cannot access Premium-only features.
- [ ] Confirm expired/unpaid user does not keep paid access.
- [ ] Confirm mobile app has no in-app payment links.

## Team Setup Process

1. Admin creates a team from web admin.
2. Admin selects team plan, athlete count, billing cycle, and payment method.
3. Admin chooses payment mode:
   - Manager pays all.
   - Every player pays.
   - Selected players pay, manager sponsors the rest.
4. Stripe links/emails are sent where required.
5. Payment queue tracks manager and player payment completion.
6. Admin approves once payments are complete or manual/cash payment is confirmed.
7. Team becomes active.
8. Members inherit team access unless individually overridden.
9. Admin can edit a member and set `Program tier` independently from the team paid plan.

## Team QA

- [ ] Create a team with manager-pays-all.
- [ ] Create a team with player payment invites.
- [ ] Create a team with selected player payers and sponsored players.
- [ ] Confirm Stripe/payment emails are sent.
- [ ] Confirm payment queue shows paid/remaining amounts correctly.
- [ ] Confirm approve is blocked until required player invite emails are ready.
- [ ] Confirm approved team becomes active.
- [ ] Add a new member after approval and confirm they inherit the team plan.
- [ ] Override one member from PHP Program to PHP Premium and confirm Premium app access.
- [ ] Confirm a team member cannot see content outside their effective access tier.

## Manual Access Override SOP

Use this when payment and access need to differ.

1. Open web admin.
2. Go to either:
   - Users -> select user -> Program tier, or
   - Teams -> select team -> member detail -> Program tier.
3. Set the access tier required inside the app.
4. Save.
5. Ask the user to refresh/reopen the app if they are already logged in.
6. Verify `/api/auth/me` returns the expected `programTier`, `planFeatures`, and `capabilities`.

## Stripe / Payment Checks

- [ ] Stripe secret key points to the correct live/test account for the environment.
- [ ] Stripe webhook endpoint is active.
- [ ] Webhook signing secret is configured.
- [ ] Every active plan has the expected Stripe price IDs or lookup keys.
- [ ] Monthly subscriptions create subscription-mode checkouts.
- [ ] One-time / 6-month / yearly payments create payment-mode checkouts.
- [ ] Payment sync button/path works if webhook delivery is delayed.
- [ ] Receipts/invoice pages render correct tier labels.

## Dashboard And Navigation Checks

- [ ] Portal dashboard explains current plan/access clearly.
- [ ] Billing page shows active plan, renewal/expiry, and available plans.
- [ ] Mobile tabs match capabilities.
- [ ] Restricted users do not see premium-only navigation.
- [ ] Premium users see the full expected app surface.
- [ ] Team managers see team operations, not athlete training-only screens.
- [ ] Error states are understandable if payment, onboarding, or auth fails.

## Final Launch Sign-Off

- [ ] Signup flow tested.
- [ ] Payment flow tested.
- [ ] Stripe integration checked.
- [ ] Tier access checked.
- [ ] Manual overrides checked.
- [ ] Team setup checked.
- [ ] Onboarding agreements checked.
- [ ] Dashboard/navigation checked.
- [ ] Mobile App Store payment boundary checked.
- [ ] No known launch blockers remain.
