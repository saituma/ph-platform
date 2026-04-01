# Scheduling Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-form booking with admin-defined service publishing, generated availability, pending request holds, and admin approval across API, admin web, parent web, and mobile.

**Architecture:** Extend the existing booking domain instead of replacing it wholesale. Keep `service_types` and `bookings` as the base, add richer service configuration plus occurrence/slot linkage, expose generated-availability APIs, then migrate admin and client UIs to consume those APIs.

**Tech Stack:** Next.js App Router, React, RTK Query, Express, Drizzle ORM, PostgreSQL, Jest

---

## File Structure

- Modify: `apps/api/src/db/schema.ts`
  - add new scheduling configuration fields and occurrence/slot linkage
- Create: `apps/api/drizzle/00xx_scheduling_redesign.sql`
  - migration for new scheduling columns/tables
- Modify: `apps/api/src/controllers/booking.controller.ts`
  - accept new service payloads and new generated-availability request inputs
- Modify: `apps/api/src/services/booking.service.ts`
  - generate occurrences, validate capacity per occurrence/slot, create pending requests
- Modify: `apps/api/src/services/admin.service.ts`
  - expose request-review friendly admin booking data if needed
- Modify: `apps/api/src/routes/booking.routes.ts`
  - add generated availability endpoint
- Modify: `apps/api/test/api.test.ts`
  - add route-level coverage
- Modify: `apps/api/test/integration/routes.integration.test.ts`
  - add integration coverage for recurrence, slot capacity, and request flow
- Modify: `apps/web/lib/apiSlice.ts`
  - add new service definition and generated-availability endpoints
- Modify: `apps/web/app/bookings/page.tsx`
  - rebuild admin bookings experience around service management and pending requests
- Modify: `apps/web/components/admin/bookings/bookings-dialogs.tsx`
  - replace simple service form with scheduling editor
- Modify: `apps/web/components/admin/bookings/booking-services-panel.tsx`
  - show richer service metadata and scheduling state
- Modify: `apps/web/test/bookings-page.test.tsx`
  - update admin-web expectations
- Modify: `apps/web/app/parent/schedule/page.tsx`
  - consume marked dates and request generated occurrences
- Modify: `apps/mobile/app/(tabs)/schedule.tsx`
  - align mobile schedule with generated date marks and request flow

### Task 1: Add scheduling data model

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/00xx_scheduling_redesign.sql`
- Test: `apps/api/test/integration/routes.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
it("stores recurring service configuration with multiple eligible plans", async () => {
  const res = await request(app)
    .post("/api/bookings/services")
    .set("Authorization", `Bearer ${ctx.adminToken}`)
    .send({
      name: "Lift Lab",
      type: "lift_lab_1on1",
      eligiblePlans: ["PHP_Plus", "PHP_Premium"],
      schedulePattern: "weekly_recurring",
      recurrenceEndMode: "weeks",
      recurrenceCount: 8,
      weeklyEntries: [{ weekday: 1, time: "16:00" }, { weekday: 3, time: "18:00" }],
      slotMode: "shared_capacity",
      durationMinutes: 30,
      capacity: 4,
      isActive: true,
    });

  expect(res.status).toBe(201);
  expect(res.body.item.eligiblePlans).toEqual(["PHP_Plus", "PHP_Premium"]);
  expect(res.body.item.schedulePattern).toBe("weekly_recurring");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- routes.integration.test.ts -t "stores recurring service configuration with multiple eligible plans"`
Expected: FAIL with schema validation or missing database fields

- [ ] **Step 3: Write minimal schema and migration**

```ts
export const serviceTypeTable = pgTable("service_types", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  type: bookingType(),
  durationMinutes: integer().notNull(),
  capacity: integer(),
  attendeeVisibility: boolean().notNull().default(true),
  defaultLocation: varchar({ length: 500 }),
  defaultMeetingLink: varchar({ length: 500 }),
  eligiblePlans: jsonb().$type<Array<"PHP" | "PHP_Plus" | "PHP_Premium">>().notNull().default(sql`'[]'::jsonb`),
  schedulePattern: varchar({ length: 32 }).notNull().default("one_time"),
  recurrenceEndMode: varchar({ length: 32 }),
  recurrenceCount: integer(),
  weeklyEntries: jsonb().$type<Array<{ weekday: number; time: string }>>(),
  oneTimeDate: date(),
  oneTimeTime: varchar({ length: 10 }),
  slotMode: varchar({ length: 32 }).notNull().default("shared_capacity"),
  slotIntervalMinutes: integer(),
  slotDefinitions: jsonb().$type<Array<{ time: string; capacity?: number }>>(),
  isActive: boolean().notNull().default(true),
  createdBy: integer().notNull().references(() => userTable.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});
```

```sql
alter table "service_types"
  add column "eligiblePlans" jsonb not null default '[]'::jsonb,
  add column "schedulePattern" varchar(32) not null default 'one_time',
  add column "recurrenceEndMode" varchar(32),
  add column "recurrenceCount" integer,
  add column "weeklyEntries" jsonb,
  add column "oneTimeDate" date,
  add column "oneTimeTime" varchar(10),
  add column "slotMode" varchar(32) not null default 'shared_capacity',
  add column "slotIntervalMinutes" integer,
  add column "slotDefinitions" jsonb;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- routes.integration.test.ts -t "stores recurring service configuration with multiple eligible plans"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle/00xx_scheduling_redesign.sql apps/api/test/integration/routes.integration.test.ts
git commit -m "feat(api): add scheduling service configuration model"
```

### Task 2: Accept and return the new service payload

**Files:**
- Modify: `apps/api/src/controllers/booking.controller.ts`
- Modify: `apps/api/src/services/booking.service.ts`
- Test: `apps/api/test/api.test.ts`

- [ ] **Step 1: Write the failing API test**

```ts
it("POST /api/bookings/services accepts recurrence and slot config", async () => {
  const res = await request(app)
    .post("/api/bookings/services")
    .send({
      name: "Premium Call",
      type: "role_model",
      eligiblePlans: ["PHP_Premium"],
      schedulePattern: "one_time",
      oneTimeDate: "2026-04-15",
      oneTimeTime: "13:00",
      slotMode: "exact_sub_slots",
      slotDefinitions: [{ time: "13:00" }, { time: "13:15" }],
      durationMinutes: 15,
      capacity: 1,
    });

  expect(res.status).toBe(201);
  expect(res.body.item.slotMode).toBe("exact_sub_slots");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- api.test.ts -t "accepts recurrence and slot config"`
Expected: FAIL with zod validation error

- [ ] **Step 3: Extend controller schemas and service persistence**

```ts
const serviceTypeSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["call", "group_call", "individual_call", "lift_lab_1on1", "role_model", "one_on_one"]),
  eligiblePlans: z.array(z.enum(ProgramType.enumValues)).default([]),
  schedulePattern: z.enum(["one_time", "weekly_recurring"]),
  recurrenceEndMode: z.enum(["weeks", "months", "forever"]).optional().nullable(),
  recurrenceCount: z.number().int().min(1).optional().nullable(),
  weeklyEntries: z.array(z.object({ weekday: z.number().int().min(0).max(6), time: z.string().min(4) })).default([]),
  oneTimeDate: z.string().optional().nullable(),
  oneTimeTime: z.string().optional().nullable(),
  slotMode: z.enum(["shared_capacity", "exact_sub_slots", "both"]),
  slotIntervalMinutes: z.number().int().min(1).optional().nullable(),
  slotDefinitions: z.array(z.object({ time: z.string(), capacity: z.number().int().min(1).optional() })).default([]),
  durationMinutes: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)),
  capacity: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().min(1)).optional(),
  attendeeVisibility: z.boolean().optional(),
  defaultLocation: z.string().optional().nullable(),
  defaultMeetingLink: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
```

```ts
const item = await createServiceType({
  ...input,
  createdBy: req.user!.id,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- api.test.ts -t "accepts recurrence and slot config"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/controllers/booking.controller.ts apps/api/src/services/booking.service.ts apps/api/test/api.test.ts
git commit -m "feat(api): accept richer scheduling service payloads"
```

### Task 3: Generate occurrences and hold capacity per occurrence or slot

**Files:**
- Modify: `apps/api/src/services/booking.service.ts`
- Modify: `apps/api/src/controllers/booking.controller.ts`
- Test: `apps/api/test/integration/routes.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
it("holds capacity on the first pending request for an occurrence", async () => {
  const availability = await request(app)
    .get("/api/bookings/generated-availability")
    .query({ from: "2026-04-01T00:00:00.000Z", to: "2026-04-30T23:59:59.999Z" })
    .set("Authorization", `Bearer ${ctx.guardianToken}`);

  const occurrence = availability.body.items[0];

  const first = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${ctx.guardianToken}`)
    .send({ serviceTypeId: occurrence.serviceTypeId, occurrenceKey: occurrence.occurrenceKey });

  const second = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${ctx.secondGuardianToken}`)
    .send({ serviceTypeId: occurrence.serviceTypeId, occurrenceKey: occurrence.occurrenceKey });

  expect(first.status).toBe(201);
  expect(second.status).toBe(400);
  expect(second.body.error).toBe("Capacity reached");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- routes.integration.test.ts -t "holds capacity on the first pending request for an occurrence"`
Expected: FAIL because generated availability endpoint and occurrence-level capacity do not exist

- [ ] **Step 3: Implement generated occurrence helpers and occurrence-level capacity validation**

```ts
export function buildGeneratedOccurrences(service: ServiceTypeRecord, from: Date, to: Date) {
  if (service.schedulePattern === "one_time") {
    return buildOneTimeOccurrence(service, from, to);
  }
  return buildWeeklyOccurrences(service, from, to);
}

export async function countActiveBookingsForOccurrence(serviceTypeId: number, occurrenceKey: string, slotKey?: string | null) {
  const rows = await db
    .select({ id: bookingTable.id })
    .from(bookingTable)
    .where(
      and(
        eq(bookingTable.serviceTypeId, serviceTypeId),
        eq(bookingTable.occurrenceKey, occurrenceKey),
        slotKey ? eq(bookingTable.slotKey, slotKey) : sql`true`,
        inArray(bookingTable.status, ["pending", "confirmed"]),
      ),
    );
  return rows.length;
}
```

```ts
if (input.occurrenceKey) {
  const held = await countActiveBookingsForOccurrence(input.serviceTypeId, input.occurrenceKey, input.slotKey ?? null);
  if (held >= maxCapacity) {
    throw new Error("Capacity reached");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- routes.integration.test.ts -t "holds capacity on the first pending request for an occurrence"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/booking.service.ts apps/api/src/controllers/booking.controller.ts apps/api/test/integration/routes.integration.test.ts
git commit -m "feat(api): generate occurrences and hold occurrence capacity"
```

### Task 4: Rebuild admin web service editor and request inbox

**Files:**
- Modify: `apps/web/lib/apiSlice.ts`
- Modify: `apps/web/components/admin/bookings/bookings-dialogs.tsx`
- Modify: `apps/web/components/admin/bookings/booking-services-panel.tsx`
- Modify: `apps/web/app/bookings/page.tsx`
- Test: `apps/web/test/bookings-page.test.tsx`

- [ ] **Step 1: Write the failing web test**

```tsx
it("shows pending requests and a richer service editor entry point", () => {
  useGetBookingsQuery.mockReturnValue({
    data: {
      bookings: [
        { id: 7, serviceName: "Lift Lab", athleteName: "Piers", status: "pending", startsAt: "2026-04-08T16:00:00.000Z" },
      ],
    },
    isLoading: false,
    refetch: jest.fn(),
  });

  useGetServicesQuery.mockReturnValue({ data: { items: [{ id: 1, name: "Lift Lab", eligiblePlans: ["PHP_Plus"] }] }, isLoading: false });

  render(<BookingsPage />);

  expect(screen.getByText("Pending Requests")).toBeInTheDocument();
  expect(screen.getByText("Create service")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- bookings-page.test.tsx -t "shows pending requests and a richer service editor entry point"`
Expected: FAIL because the page still renders the legacy layout and labels

- [ ] **Step 3: Implement the new admin flow**

```tsx
<SectionHeader
  title="Pending Requests"
  description="Approve or decline held booking requests."
/>

<Button onClick={() => setActiveDialog("new-service")}>Create service</Button>

<BookingServicesPanel
  services={services}
  isLoading={servicesLoading}
  onAddService={() => setActiveDialog("new-service")}
  onEditService={(service) => {
    setSelectedService(service);
    setActiveDialog("edit-service");
  }}
  onRefetch={() => {
    refetchServices();
    refetchBookings();
  }}
/>
```

```tsx
<Select multiple value={eligiblePlans} onChange={handleEligiblePlansChange}>
  <option value="PHP">PHP</option>
  <option value="PHP_Plus">PHP Plus</option>
  <option value="PHP_Premium">PHP Premium</option>
</Select>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- bookings-page.test.tsx -t "shows pending requests and a richer service editor entry point"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/apiSlice.ts apps/web/components/admin/bookings/bookings-dialogs.tsx apps/web/components/admin/bookings/booking-services-panel.tsx apps/web/app/bookings/page.tsx apps/web/test/bookings-page.test.tsx
git commit -m "feat(web): redesign admin scheduling workflow"
```

### Task 5: Move parent web to generated calendar requests

**Files:**
- Modify: `apps/web/lib/apiSlice.ts`
- Modify: `apps/web/app/parent/schedule/page.tsx`
- Test: `apps/web/test/bookings-page.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
it("requests a generated occurrence instead of free-form date and time", async () => {
  render(<ParentSchedulePage />);

  expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument();
  expect(screen.getByText("Available on this date")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /request/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- parent-schedule.test.tsx -t "requests a generated occurrence instead of free-form date and time"`
Expected: FAIL because the current UI still asks for arbitrary date and time

- [ ] **Step 3: Replace free-form inputs with generated date and occurrence selection**

```tsx
const { data: generatedAvailability } = useGetGeneratedAvailabilityQuery({
  from: monthStart.toISOString(),
  to: monthEnd.toISOString(),
});

const availableDates = useMemo(() => new Set(generatedAvailability?.items.map((item) => item.dateKey) ?? []), [generatedAvailability]);
const selectedDateItems = useMemo(
  () => (generatedAvailability?.items ?? []).filter((item) => item.dateKey === selectedCalendarDate),
  [generatedAvailability, selectedCalendarDate],
);
```

```tsx
<Button
  disabled={!selectedOccurrence || creatingBooking}
  onClick={() =>
    createBooking({
      serviceTypeId: selectedOccurrence.serviceTypeId,
      occurrenceKey: selectedOccurrence.occurrenceKey,
      slotKey: selectedSlot?.slotKey,
    })
  }
>
  Request
</Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- parent-schedule.test.tsx -t "requests a generated occurrence instead of free-form date and time"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/apiSlice.ts apps/web/app/parent/schedule/page.tsx apps/web/test/parent-schedule.test.tsx
git commit -m "feat(web): move parent schedule to generated requests"
```

### Task 6: Align mobile schedule with the new request model

**Files:**
- Modify: `apps/mobile/app/(tabs)/schedule.tsx`
- Test: manual validation notes in PR or follow-up mobile test file if present

- [ ] **Step 1: Write the failing mobile-focused expectation**

```ts
// Pseudocode expectation for the existing schedule screen
expect(scheduleApi.createBooking).toHaveBeenCalledWith({
  serviceTypeId: 1,
  occurrenceKey: "svc-1:2026-04-08T16:00:00.000Z",
  slotKey: "16:15",
});
```

- [ ] **Step 2: Run screen-level verification to verify it fails**

Run: `pnpm --filter mobile test -- schedule`
Expected: FAIL or missing expectation because the mobile tab still sends arbitrary `startsAt` and `endsAt`

- [ ] **Step 3: Swap mobile booking flow to generated occurrence selection**

```ts
const availability = await apiRequest<{ items: GeneratedOccurrence[] }>("/bookings/generated-availability", {
  token,
  query: { from, to },
});

await apiRequest("/bookings", {
  method: "POST",
  token,
  body: {
    serviceTypeId: selectedOccurrence.serviceTypeId,
    occurrenceKey: selectedOccurrence.occurrenceKey,
    slotKey: selectedSlot?.slotKey,
  },
});
```

- [ ] **Step 4: Run verification to verify it passes**

Run: `pnpm --filter mobile test -- schedule`
Expected: PASS, or if automated coverage is absent, complete a manual flow check for marked dates, slot selection, request submission, and pending-state refresh

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/schedule.tsx
git commit -m "feat(mobile): consume generated scheduling availability"
```

## Self-Review

### Spec coverage

- Data model expansion: covered by Tasks 1-3
- Admin workflow redesign: covered by Task 4
- Parent/mobile generated request flow: covered by Tasks 5-6
- Notification-sensitive future edits: should be implemented during Task 3 service-update work and validated with follow-up tests if not already present

### Placeholder scan

- Migration filename still needs the next real drizzle number before implementation
- Parent web test file may need creation if `apps/web/test/parent-schedule.test.tsx` does not already exist

### Type consistency

- Standardize on `eligiblePlans`, `schedulePattern`, `occurrenceKey`, `slotKey`, and `slotMode`
- Do not mix legacy `startsAt` request payloads with the new client request model once Tasks 5-6 begin
