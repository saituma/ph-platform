# Booking Slots Simplification Design

## Goal

Simplify booking logic so services no longer carry a fixed start time. Coaches publish bookable slots, and guardians book against those slots. Capacity determines whether a slot is full.

## Scope

This design keeps availability attached to a specific service type. It does not introduce global slots shared across all services.

## Product Rules

- Remove `fixedStartTime` from the create/edit service flow in web admin.
- Services remain metadata only:
  - `name`
  - `type`
  - `durationMinutes`
  - `capacity`
  - `isActive`
  - optional default location/link and tier fields already used elsewhere
- Coaches create availability by publishing slot windows for a selected service.
- Mobile and parent web show only future slots returned by the availability API.
- A guardian can book a slot if:
  - the service is active
  - the slot is still in the future
  - bookings for that `serviceTypeId + startsAt` are below capacity
- If a service is turned off, it should not appear as bookable.
- If a service is deleted, its future availability is removed with it, as already happens through the existing delete path.

## Backend Changes

- Stop accepting and persisting `fixedStartTime` in service create/update flows.
- Remove role-model special handling that forces `13:00`.
- Keep availability validation tied to `serviceTypeId`.
- Keep booking validation tied to:
  - selected service
  - selected slot
  - capacity
  - active availability block coverage
- `listAvailability` should continue returning slot data based on published availability blocks and service duration.

## Web Admin Changes

- Remove fixed start time inputs from Create New Service and Edit Service.
- Remove fixed-time messaging from Open Slots.
- Open Slots becomes fully slot-window based:
  - start date/time
  - end date/time
  - selected service
- Service table should no longer show fixed time as a meaningful field.

## Mobile And Parent Web Changes

- Remove fixed-time hints from booking UI.
- Keep current service-first, slot-second booking flow.
- Show only future slots for the selected service.
- Mark a slot unavailable when capacity is reached.

## Risks

- Existing rows with `fixedStartTime` may still exist in the database. UI and validation should ignore them after this change.
- Role-model / Premium service behavior will change from forced `13:00` to normal published-slot behavior.

## Testing

- Create service without fixed time.
- Edit service and confirm no fixed-time field appears.
- Publish availability for a service using explicit start/end times.
- Confirm mobile shows future slots only.
- Confirm full slots cannot be booked.
- Confirm inactive services do not appear in booking flows.
- Confirm deleting a service removes related availability as before.
