# Scheduling Redesign Design

## Goal

Replace the current ad hoc booking flow with an admin-defined service publishing workflow where coaches define service rules and generated availability, and clients request from those published occurrences.

## Why Change

The current model mixes together service metadata, manual booking, and availability selection:

- Admin creates a service type but still works around scheduling through calendar clicks and manual booking.
- Parent and mobile users can request arbitrary date/time combinations instead of choosing from coach-published availability.
- Capacity is tracked too loosely because it is mostly attached to the service, not to a specific occurrence or slot shape.

The new workflow makes scheduling deterministic:

- Admin defines the service once.
- The system generates future occurrences from recurrence rules.
- Clients request from those generated occurrences only.
- Requests hold capacity immediately and wait for admin approval.

## Product Model

### Core entities

- `service_type`
  - The reusable scheduling definition.
  - Holds name, booking type, eligible plans, duration, slot behavior, defaults, active state.
- `service_recurrence_rule`
  - Defines whether a service is one-time or weekly recurring.
  - Stores recurrence end condition and weekday/time rows for recurring services.
- `service_occurrence`
  - Represents a concrete future bookable date/time generated from a service type.
  - Used for mobile and parent calendar display.
- `service_slot`
  - Optional sub-slots within an occurrence when exact slot booking is enabled.
- `booking_request`
  - A pending or approved client request tied to an occurrence and optionally a slot.

### Existing-table compatibility

The current code already uses `service_types`, `availability_blocks`, and `bookings`.
To keep the migration achievable, the redesign should be implemented as an evolution of those concepts:

- `service_types` becomes the richer source of truth for service configuration.
- `availability_blocks` should no longer be treated as the main admin scheduling UI primitive.
- `bookings` should continue to store the final request/approval record, but must gain enough linkage to identify the generated occurrence and optional slot the client requested.

## Admin Workflow

### 1. Create service type

Admin creates a service type with:

- `name`
- `type`
- `eligiblePlans`
  - multi-select, not single tier
- `schedulePattern`
  - `one_time`
  - `weekly_recurring`
- `durationMinutes`
  - editable when applicable
- `capacity`
  - required for one-time services and shared-capacity services
- `slotMode`
  - `shared_capacity`
  - `exact_sub_slots`
  - `both`
- `location`
  - optional
- `meetingLink`
  - optional
- `isActive`

### 2. Configure schedule pattern

If `one_time`:

- Admin picks a single date from a mini calendar.
- Admin picks a time.
- Admin sets spots/capacity.
- Admin can optionally define exact sub-slots if slot-based booking is enabled.

If `weekly_recurring`:

- Admin adds one or more weekday rows.
- Each row contains:
  - weekday
  - time
- Admin can add multiple weekday/time rows using a plus action.
- Admin chooses recurrence end condition:
  - number of weeks
  - number of months
  - forever until disabled

### 3. Configure slot behavior

The admin can choose any of these:

- Shared capacity only
  - one occurrence start time, multiple people can request it up to capacity
- Exact sub-slots only
  - occurrence contains discrete bookable slot times such as `16:00`, `16:15`, `16:30`
- Both
  - service exposes exact slot rows and also allows multiple requests per slot or per grouped window, depending on final implementation rules

For the first release, `both` should mean:

- exact sub-slots are generated inside the occurrence
- each sub-slot can optionally carry its own capacity
- if per-slot capacity is not configured, it inherits the service/occurrence capacity

## Client Workflow

### Parent/mobile schedule

- Client sees a monthly calendar.
- Only dates with future generated occurrences are marked.
- Client taps a marked date.
- A bottom sheet or detail panel shows available service occurrences and/or slots for that date.
- Client taps `Request`.
- The system creates a pending booking request linked to the occurrence or slot.

### Capacity behavior

- Requests are first-come, first-served.
- The first pending request should hold the spot immediately.
- Once capacity is exhausted, later users should not be offered that occurrence or slot as requestable.

### Approval behavior

- Every request requires admin approval.
- Pending requests appear on the admin schedule page.
- Admin can approve or decline them.
- Approval finalizes the booking without changing the held capacity.

## Edit Behavior

Admins can edit future scheduling configuration after publish.

Rules:

- Future pending bookings receive a change notification.
- Future approved bookings receive a change notification.
- Past bookings are unchanged.
- Existing future occurrences should be regenerated or updated to match the new rules.
- Existing future requests should stay linked if their occurrence still exists; otherwise they should be flagged as changed and surfaced for admin review.

## Notifications

Create or update notifications for:

- client submits request
  - email to admin
  - email to client
- admin approves request
  - email to client
- admin declines request
  - email to client
- admin changes future service details affecting pending/approved requests
  - email to affected client
  - optional in-app notification

Past bookings should not receive change notifications.

## UX Changes

### Admin bookings page

The current page should shift from:

- raw calendar
- services table
- manual booking card

to:

- service type management
- generated schedule preview
- pending requests inbox
- approved upcoming sessions
- edit flow focused on recurrence and slot rules instead of one-off availability blocks

### Client schedule page

The current page should shift from:

- select service
- pick arbitrary date
- pick arbitrary time

to:

- calendar with marked available dates
- tap a date to see published service options
- request a specific occurrence/slot only

This is the key product change.

## Backend Design Direction

### Service configuration

Extend service creation/update payloads to support:

- `eligiblePlans: ProgramType[]`
- `schedulePattern`
- `recurrenceEndMode`
- `recurrenceCount`
- `weeklyEntries`
- `oneTimeDate`
- `oneTimeTime`
- `slotMode`
- `slotIntervalMinutes`
- `slotDefinitions`
- `capacity`
- `defaultLocation`
- `defaultMeetingLink`

### Generated availability

Introduce server-side generation of future occurrences from service definitions.

Generation rules:

- one-time service generates one occurrence
- weekly recurring service generates occurrences for configured weekday/time rows
- generation horizon should be bounded for query efficiency
  - recommended initial horizon: 90 days
- open-ended recurring services should generate occurrences only inside the query horizon

### Booking validation

Client booking creation must validate:

- service is active
- client plan is eligible
- occurrence exists and is in the future
- slot exists when slot-based request is used
- capacity has not been exhausted by pending/confirmed requests

### Data linkage

Each booking should be tied to:

- `serviceTypeId`
- `occurrenceKey` or `serviceOccurrenceId`
- optional `slotKey` or `serviceSlotId`

This is required for safe change notifications and exact capacity checks.

## Migration Strategy

Implement in slices to reduce risk:

1. Enrich service types and add generated occurrence APIs.
2. Update admin web to create/edit the new service model.
3. Update parent web and mobile to request generated occurrences instead of free-form times.
4. Move admin bookings page to request-review and published-schedule management.
5. Deprecate legacy availability-block authoring UI after parity is reached.

## Risks

- Existing bookings only know `serviceTypeId` and start/end timestamps, so migration must preserve backward compatibility.
- Current capacity checks count by service type globally, which will be incorrect for occurrence-level booking until redesigned.
- Weekly recurring generation can create duplicate or stale occurrences if edit and regeneration rules are not idempotent.
- Notifications can become noisy if every edit sends duplicate emails.

## Decisions

- Multiple plans can be eligible for the same service type.
- Weekly recurrence supports end after weeks, end after months, or no end until disabled.
- Slot behavior can be shared-capacity, exact sub-slots, or both.
- All client requests require admin approval.
- Capacity is held immediately on pending request.
- Admin can edit future service configuration at any time.
- Future pending and approved bookings receive change notifications.
- Past bookings do not.

## Out of Scope For First Release

- Waitlists
- automatic approval
- recurring client-side subscriptions to a service
- advanced conflict resolution across two different service types
- timezone-specific custom publishing per athlete

## Acceptance Criteria

- Admin can create one-time and weekly recurring services from a single service editor.
- Admin can assign multiple eligible plans to the same service.
- Admin can configure slot behavior as shared-capacity, exact sub-slots, or both.
- Parent/mobile calendars only show dates that have generated future availability.
- Client can only request a generated occurrence or slot.
- Pending requests hold capacity immediately.
- Admin can review pending requests on the bookings page.
- Future pending and approved requests receive notifications when the service changes.
- Past bookings are unaffected by service edits.
