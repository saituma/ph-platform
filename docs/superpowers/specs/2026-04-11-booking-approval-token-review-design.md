# Booking Approval (Token Review + Edit) Design

## Goal

Enable a booking request workflow where:

- Guardians/athletes can request a booking from mobile.
- The request is **pending** until a coach/admin reviews it.
- The coach/admin can **edit time/date, location, and meeting link** during review.
- The coach/admin can **approve** or **decline**.
- Users receive **email + push** updates on request and outcome.

This design also enforces that **mobile users cannot provide their own location/link**; they can only see coach-configured defaults (or “TBD”).

## In-Scope

- Mobile booking request UI: show location/link read-only.
- Backend booking create: ignore client-provided location/link and apply service defaults.
- Public (no-login) token review page in web for coach/admin.
- Public API endpoints to fetch booking details and to approve/decline with optional edits.
- Email + push updates for request + approval/decline.
- In-app notification type correctness for “booking requested”.

## Out of Scope

- New database tables or a separate “booking_request” entity.
- Changing booking status enum values (remains `pending | confirmed | declined | cancelled`).
- Adding new admin-facing screens beyond upgrading the existing token page.

## Current Data Model (Authoritative)

Backend schema already supports the needed fields:

- `service_types.defaultLocation` (nullable)
- `service_types.defaultMeetingLink` (nullable)
- `bookings.location` (nullable)
- `bookings.meetingLink` (nullable)
- `bookings.startsAt` (required)
- `bookings.endTime` (nullable)
- `bookings.status` (`pending | confirmed | declined | cancelled`)

See:

- [apps/api/src/db/schema.ts](apps/api/src/db/schema.ts#L769-L914)

## Product Rules

### Requesting (mobile)

- The user selects a service + time slot (existing behavior).
- Mobile shows:
  - Location: service default or `TBD (coach will confirm)`
  - Meeting link: service default or `TBD (coach will confirm)`
- Location/link are **not editable** by the user.
- Request submission is always allowed even if defaults are missing (Decision A).

### Review + Approve/Decline (coach/admin)

- Coach/admin receives an email with a link to a web page that requires **no login**.
- That web page:
  - Loads booking details using a signed token.
  - Allows editing:
    - `startsAt`
    - `endTime`
    - `location`
    - `meetingLink`
  - Provides actions:
    - Approve (saves edits + sets booking `status=confirmed`)
    - Decline (sets booking `status=declined`, ignores edits)

### Notifications

- On request created:
  - Coach/admin: email with the review link.
  - User: push + email confirming request is pending approval.
  - In-app notification record: type should reflect “requested” (not “confirmed”).
- On approve/decline:
  - User: push + email.
  - In-app notification record: existing confirmed/declined notifications remain.

## Web UX (Token Page)

Upgrade the existing route:

- [apps/web/app/booking-action/page.tsx](apps/web/app/booking-action/page.tsx)

New behavior:

- If token is missing/invalid/expired: show an error.
- If booking is not `pending`: show a message that the request has already been processed.
- Otherwise show:
  - Booking details summary (athlete, service name, requested time)
  - Editable fields (startsAt, location, meetingLink, optional endTime)
  - Buttons: Approve / Decline
  - Success/failure result message

This replaces the current one-click action behavior.

Email links should use a **review token** only. Approve/decline happen from within the token page via `POST`.

## Public API Changes

### Token format

Extend the existing HMAC token system in:

- [apps/api/src/lib/booking-actions.ts](apps/api/src/lib/booking-actions.ts)

Change:

- Add a new action type `review` (and keep `approve`/`decline` supported for backward compatibility).
- Keep TTL at 7 days.

### Endpoints

Existing endpoint:

- `GET /api/public/booking-action?token=...`

New rules:

- If token action is `approve` or `decline`:
  - Preserve current behavior (one-click update) for backward compatibility.
- If token action is `review`:
  - Return booking details JSON needed for the token page.

Add a new endpoint:

- `POST /api/public/booking-action`

Request body:

```json
{
  "token": "<review-token>",
  "action": "approve" | "decline",
  "updates": {
    "startsAt": "2026-04-11T10:00:00.000Z",
    "endTime": "2026-04-11T10:30:00.000Z",
    "location": "...",
    "meetingLink": "..."
  }
}
```

Behavior:

- Verify token is valid and action is `review`.
- Load booking by id.
- Reject if booking status is not `pending`.
- If `action=approve`:
  - Validate updates (see Validation section).
  - Persist edits and set status to `confirmed`.
- If `action=decline`:
  - Set status to `declined`.
- Return a simple JSON response `{ ok: true, message: "..." }`.

## Backend Booking Create Contract (Mobile)

User create endpoint currently accepts optional `location` and `meetingLink`.

New contract:

- Mobile should no longer send `location` / `meetingLink`.
- Server should be backward compatible:
  - If older clients send these fields, the server ignores them.
- Server sets:
  - `bookings.location = service_types.defaultLocation ?? null`
  - `bookings.meetingLink = service_types.defaultMeetingLink ?? null`

## Validation

### Public approve (with edits)

- `startsAt` must be a valid timestamp.
- `endTime` (if used) must be a valid timestamp and after `startsAt`.
- `startsAt` must be in the future at the time of approval.
- `location` and `meetingLink`:
  - optional strings
  - trim whitespace
  - length limit: 500 chars (matches schema)
- Meeting link should accept normal URL strings; do not hard-fail on URL parsing unless the codebase already enforces strict URL validation.

Availability/capacity validation is not re-applied during approval: the coach/admin is explicitly confirming the time.

### Security constraints

- Token must not allow arbitrary booking edits:
  - Token encodes bookingId + action + expiry and is HMAC-signed.
  - POST accepts only a **review** token (not approve/decline tokens).
  - Only specific editable fields are accepted.
- Idempotency:
  - Once a booking is no longer `pending`, the public endpoints must return a non-200 with an “already processed” message.

## Email Content

Ensure emails include location/link when present, and `TBD` when null.

- Request email to coach/admin:
  - includes booking details + review link
  - explicitly notes coach can edit time/location/link before approving
- User request email:
  - subject/body indicates “Request received — pending approval”
- User approved email:
  - includes final time + location + meeting link
- User declined email:
  - includes requested time and a short decline message

## In-App Notifications

Fix the request notification record type so it does not use a confirmed-type label.

- On request: use a request-specific type (e.g. `booking_requested`) and content.
- On confirmed/declined: keep existing types if already consistent.

## Testing

- Mobile:
  - Location/link inputs are not editable.
  - When defaults are missing, UI shows “TBD (coach will confirm)”.
  - Request submits successfully.
- API:
  - Create booking ignores client-provided `location/meetingLink`.
  - Public GET with `review` token returns booking details.
  - Public POST approve:
    - persists edits
    - transitions `pending → confirmed`
  - Public POST decline:
    - transitions `pending → declined`
  - Any action on non-`pending` booking returns “already processed”.
  - Expired token rejected.
- Notifications:
  - Request created sends user email/push and coach/admin email.
  - Approve/decline sends user email/push.
