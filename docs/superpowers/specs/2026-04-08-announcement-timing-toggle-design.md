# Announcement Timing + On/Off Toggle Design

**Goal:** Allow admins to edit announcement timing and turn announcements on/off. Users should only see announcements that are enabled and within their active time window.

## Scope
- Admins can:
  - Edit timing (permanent vs scheduled with start/end).
  - Toggle announcements on/off.
- Users:
  - Only see announcements that are enabled **and** within schedule (if set).
- Admin list:
  - Shows schedule status + on/off state for each announcement.

## Data Model
### `contents` table (announcements)
- Add:
  - `isActive: boolean` (default `true`)
- Existing:
  - `startsAt?: timestamp`
  - `endsAt?: timestamp`

## API Changes
### Create announcement
Accept:
- `announcementStartsAt?: Date`
- `announcementEndsAt?: Date`
- `announcementIsActive?: boolean` (default `true`)

Validation:
- If either start or end provided, both required.
- `end > start`.

### Update announcement
Allow editing:
- `announcementStartsAt/EndsAt`
- `announcementIsActive`

Validation mirrors create.

### List announcements
- Admins: return all announcements (including off/expired).
- Users: filter to `isActive=true` and schedule active.

## Web UI
### Create Announcement
- Add **Timing** selector: Permanent / Scheduled.
- If scheduled: show start + end datetime inputs.

### Recent Announcements (Edit)
- Add **Status** toggle (On/Off).
- Add **Timing** controls in edit mode:
  - Permanent / Scheduled
  - Start/End datetime inputs
- Display metadata:
  - `Status: On/Off`
  - `Permanent` or `Active <start> → <end>` (or `Starts/Ends` if only one present; ideally we enforce both).

## Behavior
- Off announcements never show to users.
- Scheduled announcements show only within the start/end window.
- Admins always see all announcements for review/edit.

## Edge Cases
- Invalid schedule: block save with inline error/toast.
- Toggle off then on: scheduling rules still apply.
- Permanent + Off: not visible to users.

## Migration
- Add `isActive boolean default true` to `contents`.

## Testing (Manual)
- Create permanent announcement (On) → visible to users.
- Create scheduled announcement in the future → not visible to users until start.
- Toggle announcement Off → hidden from users.
- Edit schedule and ensure visibility updates correctly.
