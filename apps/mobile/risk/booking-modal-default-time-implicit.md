# Booking Modal Default Time Is Implicit

## Severity
Medium

## Risk
When service is not one-time dated, booking request auto-selects tomorrow at 12:00 without explicit user date/time selection in this flow.

## Evidence
- `apps/mobile/components/tracking/schedule/BookingModal.tsx`:
  - `startsAt.setDate(startsAt.getDate() + 1);`
  - `startsAt.setHours(12, 0, 0, 0);`

## Impact
User expectation mismatch and accidental requests for unintended times.

## Recommendation
Require explicit date/time selection or clearly disclose and confirm the default timestamp before submit.
