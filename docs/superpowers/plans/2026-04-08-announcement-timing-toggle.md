# Announcement Timing + Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to edit announcement timing and turn announcements on/off, while users only see enabled announcements within their schedule.

**Architecture:** Add an `isActive` flag to announcements, extend create/update validation to include schedule + toggle, and update announcement filtering for non-admin users. Web UI will expose status/timing controls in create and edit flows and display schedule/status in the list.

**Tech Stack:** PostgreSQL + Drizzle, Express + Zod, React (Next.js App Router), RTK Query.

---

## File Map

- **Create:**
  - `apps/api/drizzle/0058_announcement_active.sql` (migration)
- **Modify:**
  - `apps/api/drizzle/meta/_journal.json`
  - `apps/api/src/db/schema.ts`
  - `apps/api/src/controllers/content.controller.ts`
  - `apps/api/src/services/content.service.ts`
  - `apps/web/components/admin/messaging/types.ts`
  - `apps/web/app/messaging/page.tsx`

---

### Task 1: Add `isActive` to announcements (DB + schema)

**Files:**
- Create: `apps/api/drizzle/0058_announcement_active.sql`
- Modify: `apps/api/drizzle/meta/_journal.json`
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Add migration SQL**

```sql
-- apps/api/drizzle/0058_announcement_active.sql
ALTER TABLE "contents"
ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true;
```

- [ ] **Step 2: Register migration in journal**

Add a new entry after `0057_announcement_schedule`:

```json
{
  "idx": 58,
  "version": "7",
  "when": 1775639000000,
  "tag": "0058_announcement_active",
  "breakpoints": true
}
```

- [ ] **Step 3: Update Drizzle schema**

```ts
// apps/api/src/db/schema.ts (contentTable)
export const contentTable = pgTable("contents", {
  // ...
  startsAt: timestamp(),
  endsAt: timestamp(),
  isActive: boolean().notNull().default(true),
  createdBy: integer().notNull().references(() => userTable.id),
  // ...
});
```

- [ ] **Step 4: Run migrations**

Run: `pnpm --filter api db:migrate`  
Expected: migration completes without missing journal errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/drizzle/0058_announcement_active.sql apps/api/drizzle/meta/_journal.json apps/api/src/db/schema.ts
git commit -m "feat(api): add announcement active flag"
```

---

### Task 2: Extend announcement validation + persistence

**Files:**
- Modify: `apps/api/src/controllers/content.controller.ts`
- Modify: `apps/api/src/services/content.service.ts`

- [ ] **Step 1: Extend create/update schemas**

```ts
// apps/api/src/controllers/content.controller.ts
const announcementDateSchema = z.union([z.coerce.date(), z.null()]);

const contentCreateSchema = z.object({
  // ...
  announcementStartsAt: announcementDateSchema.optional(),
  announcementEndsAt: announcementDateSchema.optional(),
  announcementIsActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // existing checks...
  const start = data.announcementStartsAt ?? null;
  const end = data.announcementEndsAt ?? null;
  if ((start && !end) || (!start && end)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start and end time are required together.",
      path: ["announcementStartsAt"],
    });
  }
  if (start && end && end.getTime() < start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time.",
      path: ["announcementEndsAt"],
    });
  }
});

const contentUpdateSchema = z.object({
  // existing fields...
  announcementStartsAt: announcementDateSchema.optional(),
  announcementEndsAt: announcementDateSchema.optional(),
  announcementIsActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const start = data.announcementStartsAt ?? null;
  const end = data.announcementEndsAt ?? null;
  if ((start && !end) || (!start && end)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Start and end time are required together.",
      path: ["announcementStartsAt"],
    });
  }
  if (start && end && end.getTime() < start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time.",
      path: ["announcementEndsAt"],
    });
  }
});
```

- [ ] **Step 2: Pass active/timing through create**

```ts
// apps/api/src/controllers/content.controller.ts (createContentItem)
const announcementStartsAt = isAnnouncement ? input.announcementStartsAt : undefined;
const announcementEndsAt = isAnnouncement ? input.announcementEndsAt : undefined;
const announcementIsActive = isAnnouncement ? input.announcementIsActive ?? true : undefined;

const item = await createContent({
  // ...
  startsAt: announcementStartsAt ?? undefined,
  endsAt: announcementEndsAt ?? undefined,
  isActive: announcementIsActive,
  // ...
});
```

- [ ] **Step 3: Allow update to edit timing + on/off**

```ts
// apps/api/src/controllers/content.controller.ts (updateContentItem)
const item = await updateContent({
  id: contentId,
  title: input.title,
  content: input.content,
  type: input.type,
  body: input.body,
  programTier: input.programTier,
  category: input.category,
  ageList: input.ageList,
  minAge: input.minAge,
  maxAge: input.maxAge,
  startsAt: input.announcementStartsAt ?? undefined,
  endsAt: input.announcementEndsAt ?? undefined,
  isActive: input.announcementIsActive,
});
```

- [ ] **Step 4: Persist in service + filter by active**

```ts
// apps/api/src/services/content.service.ts
function isAnnouncementActive(
  item: { startsAt?: Date | null; endsAt?: Date | null; isActive?: boolean | null },
  now: Date,
) {
  if (item.isActive === false) return false;
  if (item.startsAt && now < item.startsAt) return false;
  if (item.endsAt && now > item.endsAt) return false;
  return true;
}

export async function createContent(input: {
  // ...
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean | null;
  createdBy: number;
}) {
  // ...
  .values({
    // ...
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive ?? true,
    createdBy: input.createdBy,
  })
}

export async function updateContent(input: {
  // ...
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean | null;
}) {
  const updatePayload: Record<string, unknown> = {
    title: input.title,
    content: input.content,
    type: input.type as any,
    body: input.body ?? null,
    programTier: input.programTier ?? null,
    category: input.category ?? null,
    ageList: ageList && ageList.length ? ageList : null,
    minAge: ageList && ageList.length ? null : input.minAge ?? null,
    maxAge: ageList && ageList.length ? null : input.maxAge ?? null,
    updatedAt: new Date(),
  };
  if ("startsAt" in input) updatePayload.startsAt = input.startsAt ?? null;
  if ("endsAt" in input) updatePayload.endsAt = input.endsAt ?? null;
  if ("isActive" in input) updatePayload.isActive = input.isActive ?? true;

  const result = await db.update(contentTable).set(updatePayload).where(eq(contentTable.id, input.id)).returning();
  return result[0] ?? null;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/controllers/content.controller.ts apps/api/src/services/content.service.ts
git commit -m "feat(api): allow announcement timing and active toggle"
```

---

### Task 3: Web UI — edit timing + on/off

**Files:**
- Modify: `apps/web/components/admin/messaging/types.ts`
- Modify: `apps/web/app/messaging/page.tsx`

- [ ] **Step 1: Add fields to announcement type**

```ts
// apps/web/components/admin/messaging/types.ts
export type AnnouncementItem = {
  id: number | string;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
  createdBy?: number | string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean | null;
};
```

- [ ] **Step 2: Add edit state + helpers**

```ts
// apps/web/app/messaging/page.tsx
function toLocalInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const [editAnnouncementTimingType, setEditAnnouncementTimingType] = useState<"permanent" | "scheduled">("permanent");
const [editAnnouncementStartsAt, setEditAnnouncementStartsAt] = useState("");
const [editAnnouncementEndsAt, setEditAnnouncementEndsAt] = useState("");
const [editAnnouncementIsActive, setEditAnnouncementIsActive] = useState(true);
```

- [ ] **Step 3: Populate edit state**

```ts
// apps/web/app/messaging/page.tsx (startEditAnnouncement)
setEditAnnouncementIsActive(item.isActive ?? true);
if (item.startsAt && item.endsAt) {
  setEditAnnouncementTimingType("scheduled");
  setEditAnnouncementStartsAt(toLocalInputValue(item.startsAt));
  setEditAnnouncementEndsAt(toLocalInputValue(item.endsAt));
} else {
  setEditAnnouncementTimingType("permanent");
  setEditAnnouncementStartsAt("");
  setEditAnnouncementEndsAt("");
}
```

- [ ] **Step 4: Add edit UI controls + validation**

```tsx
// apps/web/app/messaging/page.tsx (edit block)
<div className="grid gap-2 md:grid-cols-2">
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">Status</p>
    <Select
      value={editAnnouncementIsActive ? "on" : "off"}
      onChange={(event) => setEditAnnouncementIsActive(event.target.value === "on")}
    >
      <option value="on">On</option>
      <option value="off">Off</option>
    </Select>
  </div>
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">Timing</p>
    <Select
      value={editAnnouncementTimingType}
      onChange={(event) =>
        setEditAnnouncementTimingType(event.target.value as "permanent" | "scheduled")
      }
    >
      <option value="permanent">Permanent</option>
      <option value="scheduled">Scheduled</option>
    </Select>
  </div>
</div>
{editAnnouncementTimingType === "scheduled" ? (
  <div className="grid gap-2 md:grid-cols-2">
    <Input type="datetime-local" value={editAnnouncementStartsAt} onChange={(e) => setEditAnnouncementStartsAt(e.target.value)} />
    <Input type="datetime-local" value={editAnnouncementEndsAt} onChange={(e) => setEditAnnouncementEndsAt(e.target.value)} />
  </div>
) : null}
```

- [ ] **Step 5: Send timing + status on update**

```ts
// apps/web/app/messaging/page.tsx (handleUpdateAnnouncement)
const startsAt =
  editAnnouncementTimingType === "scheduled" && isValidDateTimeValue(editAnnouncementStartsAt)
    ? new Date(editAnnouncementStartsAt).toISOString()
    : null;
const endsAt =
  editAnnouncementTimingType === "scheduled" && isValidDateTimeValue(editAnnouncementEndsAt)
    ? new Date(editAnnouncementEndsAt).toISOString()
    : null;

await updateAnnouncement({
  id: editingAnnouncementId,
  title: editAnnouncementTitle.trim(),
  content: editAnnouncementTitle.trim(),
  type: "article",
  body: editAnnouncementBody.trim(),
  announcementStartsAt: startsAt,
  announcementEndsAt: endsAt,
  announcementIsActive: editAnnouncementIsActive,
}).unwrap();
```

- [ ] **Step 6: Show status in list**

```tsx
<p className="mt-1 text-xs text-muted-foreground">
  Status: {item.isActive === false ? "Off" : "On"}
</p>
<p className="mt-1 text-xs text-muted-foreground">
  {formatSchedule(item.startsAt, item.endsAt)}
</p>
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/admin/messaging/types.ts apps/web/app/messaging/page.tsx
git commit -m "feat(web): edit announcement timing and status"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Create announcement (permanent, on)**
  - Expected: shows in recent list with `Status: On` + `Permanent`.
- [ ] **Step 2: Edit to scheduled**
  - Set future start/end.
  - Expected: list shows `Active <start> → <end>`.
- [ ] **Step 3: Toggle off**
  - Expected: list shows `Status: Off` and users do not receive it.

---

## Self-Review
- **Spec coverage:** On/off toggle, edit timing, create timing, API filtering handled by `isActive` + schedule.
- **Placeholder scan:** No TBD/TODO; all steps include code or commands.
- **Type consistency:** `announcementIsActive/StartsAt/EndsAt` used consistently across API + web.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-08-announcement-timing-toggle.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
