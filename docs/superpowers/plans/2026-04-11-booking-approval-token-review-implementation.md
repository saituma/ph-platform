# Booking Approval (Token Review + Edit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the booking request review/edit/approve/decline flow using a no-login token page, while keeping existing approve/decline token links working.

**Architecture:**

- Keep the existing HMAC token mechanism and `GET /api/public/booking-action?token=...` behavior for `approve|decline` tokens.
- Add a new token action `review`, where `GET` returns booking details JSON, and `POST` performs approve/decline with optional edits.
- Upgrade the existing Next.js `/booking-action` page to render a review/edit UI when the token is a `review` token.

**Tech Stack:** Express + Zod + Drizzle (API), Next.js App Router (web), Expo/React Native (mobile)

---

## File Map

**API (apps/api)**

- Modify: `apps/api/src/lib/booking-actions.ts` (add `review` action)
- Modify: `apps/api/src/controllers/booking.controller.ts` (upgrade GET handler; add POST handler)
- Modify: `apps/api/src/routes/booking.routes.ts` (add POST route)
- Modify: `apps/api/src/controllers/booking.controller.ts` (ignore client `location/meetingLink` on create)
- Modify: `apps/api/src/services/booking/notification.service.ts` (send `review` link; fix notification type)
- Modify: `apps/api/src/lib/mailer/booking.mailer.ts` (include location/link + "TBD"; update admin email CTA)
- Modify: `apps/api/src/services/admin/booking.service.ts` (add helper to edit booking fields for approval)

**Web (apps/web)**

- Modify: `apps/web/app/booking-action/page.tsx` (render review/edit flow)
- Create: `apps/web/app/booking-action/BookingActionClient.tsx` (client UI + POST approve/decline)

**Mobile (apps/mobile)**

- Modify: `apps/mobile/components/tracking/schedule/BookingModal.tsx` (read-only location/link; show TBD; do not send fields)

**Tests**

- Create: `apps/api/test/unit/booking-actions.test.ts` (token parsing supports `review` and backwards compatibility)

---

## Task 1: Extend Booking Action Tokens

**Files:**

- Modify: `apps/api/src/lib/booking-actions.ts`
- Test: `apps/api/test/unit/booking-actions.test.ts`

- [ ] **Step 1: Add `review` to action type**

- [ ] **Step 2: Ensure verifier accepts `review` and still accepts approve/decline**

- [ ] **Step 3: Add unit tests**

Run: `pnpm --filter api test booking-actions` (or `pnpm --filter api test`)

---

## Task 2: Public Booking Action API (GET review + POST act)

**Files:**

- Modify: `apps/api/src/controllers/booking.controller.ts`
- Modify: `apps/api/src/routes/booking.routes.ts`
- Modify: `apps/api/src/services/admin/booking.service.ts`

- [ ] **Step 1: Keep GET behavior for approve/decline tokens**

- [ ] **Step 2: For `review` token, GET returns booking details JSON**

- [ ] **Step 3: Add POST endpoint**
  - Input: `{ token, action: "approve"|"decline", updates?: { startsAt, endTime, location, meetingLink } }`
  - Validate: startsAt future; endTime after startsAt; string length <= 500; trim strings
  - Enforce: token action must be `review`
  - Enforce: booking must be `pending` else return non-200 "already processed"
  - Approve: persist edits, then transition to confirmed (re-uses existing notification/email push logic)
  - Decline: transition to declined (ignore edits)

---

## Task 3: Ignore Mobile-Sent Location/MeetingLink on Booking Create

**Files:**

- Modify: `apps/api/src/controllers/booking.controller.ts`

- [ ] **Step 1: Remove passing `location/meetingLink` into `createBooking` from user create endpoint**

---

## Task 4: Notifications + Emails

**Files:**

- Modify: `apps/api/src/services/booking/notification.service.ts`
- Modify: `apps/api/src/lib/mailer/booking.mailer.ts`

- [ ] **Step 1: Generate a `review` token for admin email and link to web token page**

- [ ] **Step 2: Fix in-app notification type for request**

- [ ] **Step 3: Ensure all emails render location/link, using `TBD (coach will confirm)` when missing**

---

## Task 5: Web Token Review Page

**Files:**

- Modify: `apps/web/app/booking-action/page.tsx`
- Create: `apps/web/app/booking-action/BookingActionClient.tsx`

- [ ] **Step 1: Fetch booking details for review token and show edit form**

- [ ] **Step 2: POST approve/decline and show result**

- [ ] **Step 3: Handle already processed / invalid token**

---

## Task 6: Mobile UI Read-only Defaults

**Files:**

- Modify: `apps/mobile/components/tracking/schedule/BookingModal.tsx`

- [ ] **Step 1: Replace editable inputs with read-only summary**

- [ ] **Step 2: Show `TBD (coach will confirm)` when defaults missing**

- [ ] **Step 3: Stop sending `location/meetingLink` in request body**

---

## Verification

- [ ] API build: `pnpm --filter api build`
- [ ] Web build: `pnpm --filter web build`
- [ ] Full build: `pnpm turbo run build`
