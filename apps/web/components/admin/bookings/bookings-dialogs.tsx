"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select } from "../../ui/select";
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useCreateAdminBookingMutation,
} from "../../../lib/apiSlice";

export type BookingsDialog =
  | null
  | "new-service"
  | "edit-service"
  | "new-booking"
  | "calendar"
  | "booking-details";

function getRtkErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: { error?: string; issues?: { path: string[]; message: string }[] } }).data;
    if (data?.error === "Invalid request" && Array.isArray(data.issues)) {
      return data.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" | ");
    }
    if (typeof data?.error === "string") return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type ServiceType = {
  id: number;
  name: string;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  eligiblePlans?: string[] | null;
  schedulePattern?: string | null;
  recurrenceEndMode?: string | null;
  recurrenceCount?: number | null;
  weeklyEntries?: { weekday: number; time: string }[] | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  slotMode?: string | null;
  slotIntervalMinutes?: number | null;
  slotDefinitions?: { time: string; capacity?: number | null }[] | null;
  isActive?: boolean | null;
};

type BookingsDialogsProps = {
  active: BookingsDialog;
  onClose: () => void;
  bookings?: {
    id: number;
    name: string;
    athlete: string;
    time: string;
    type: string;
    status?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    startsAt?: string | null;
    endTime?: string | null;
  }[];
  selectedBooking?: {
    id: number;
    name: string;
    athlete: string;
    time: string;
    type: string;
    status?: string | null;
    location?: string | null;
    meetingLink?: string | null;
    startsAt?: string | null;
    endTime?: string | null;
  } | null;
  services?: ServiceType[];
  users?: { id: number; name?: string | null; email?: string | null; role?: string | null; athleteName?: string | null }[];
  selectedService?: ServiceType | null;
  onRefresh?: () => void;
  onApproveBooking?: (bookingId: number) => Promise<void>;
  onDeclineBooking?: (bookingId: number) => Promise<void>;
  isApproving?: boolean;
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
  group_call: "Group Call",
  individual_call: "1:1",
  one_on_one: "1:1",
  lift_lab_1on1: "Lift Lab 1:1",
  role_model: "Premium",
  call: "Call",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  requested: "Requested",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
  pending: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  requested: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  declined: "border-rose-200/70 bg-rose-50/80 text-rose-700",
  cancelled: "border-slate-200/70 bg-slate-50/80 text-slate-700",
};

const pad = (value: number) => String(value).padStart(2, "0");

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatDay = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function BookingsDialogs({
  active,
  onClose,
  bookings = [],
  selectedBooking,
  services = [],
  users = [],
  selectedService,
  onRefresh,
  onApproveBooking,
  onDeclineBooking,
  isApproving = false,
}: BookingsDialogsProps) {
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState("group_call");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [capacity, setCapacity] = useState("");
  const [programTier, setProgramTier] = useState("");
  const [eligiblePlans, setEligiblePlans] = useState<string[]>([]);
  const [schedulePattern, setSchedulePattern] = useState("one_time");
  const [recurrenceEndMode, setRecurrenceEndMode] = useState("forever");
  const [recurrenceCount, setRecurrenceCount] = useState("");
  const [weeklyEntries, setWeeklyEntries] = useState<Array<{ weekday: string; time: string }>>([{ weekday: "1", time: "" }]);
  const [oneTimeDate, setOneTimeDate] = useState("");
  const [oneTimeTime, setOneTimeTime] = useState("");
  const [slotMode, setSlotMode] = useState("shared_capacity");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState("");
  const [slotDefinitions, setSlotDefinitions] = useState<Array<{ time: string; capacity: string }>>([{ time: "", capacity: "" }]);
  const [attendeeVisibility, setAttendeeVisibility] = useState(true);
  const [defaultLocation, setDefaultLocation] = useState("");
  const [defaultVideoLink, setDefaultVideoLink] = useState("");
  const [serviceIsActive, setServiceIsActive] = useState(true);
  const [bookingUserId, setBookingUserId] = useState("");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [guardianSearch, setGuardianSearch] = useState("");
  const [showGuardianSuggestions, setShowGuardianSuggestions] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingHour, setBookingHour] = useState("");
  const [bookingMinute, setBookingMinute] = useState("");
  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [bookingLocation, setBookingLocation] = useState("");
  const [bookingMeetingLink, setBookingMeetingLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createService, { isLoading: isCreatingService }] = useCreateServiceMutation();
  const [updateService, { isLoading: isUpdatingService }] = useUpdateServiceMutation();
  const [createAdminBooking, { isLoading: isCreatingBooking }] = useCreateAdminBookingMutation();

  useEffect(() => {
    if (active === "new-service") {
      setServiceName("");
      setServiceType("group_call");
      setDurationMinutes("");
      setCapacity("");
      setProgramTier("");
      setEligiblePlans([]);
      setSchedulePattern("one_time");
      setRecurrenceEndMode("forever");
      setRecurrenceCount("");
      setWeeklyEntries([{ weekday: "1", time: "" }]);
      setOneTimeDate("");
      setOneTimeTime("");
      setSlotMode("shared_capacity");
      setSlotIntervalMinutes("");
      setSlotDefinitions([{ time: "", capacity: "" }]);
      setAttendeeVisibility(true);
      setDefaultLocation("");
      setDefaultVideoLink("");
      setServiceIsActive(true);
      return;
    }

    if (active === "new-booking") {
      setBookingUserId("");
      setBookingServiceId("");
      setGuardianSearch("");
      setShowGuardianSuggestions(false);
      setBookingDate("");
      setBookingHour("");
      setBookingMinute("");
      setBookingStatus("confirmed");
      setBookingLocation("");
      setBookingMeetingLink("");
      setError(null);
      return;
    }

    if (active === "edit-service" && selectedService) {
      setServiceName(selectedService.name ?? "");
      setServiceType(selectedService.type ?? "group_call");
      setDurationMinutes(String(selectedService.durationMinutes ?? 30));
      setCapacity(selectedService.capacity ? String(selectedService.capacity) : "");
      setProgramTier(selectedService.programTier ?? "");
      setEligiblePlans(selectedService.eligiblePlans ?? (selectedService.programTier ? [selectedService.programTier] : []));
      setSchedulePattern(selectedService.schedulePattern ?? "one_time");
      setRecurrenceEndMode(selectedService.recurrenceEndMode ?? "forever");
      setRecurrenceCount(selectedService.recurrenceCount ? String(selectedService.recurrenceCount) : "");
      setWeeklyEntries(
        selectedService.weeklyEntries?.length
          ? selectedService.weeklyEntries.map((entry) => ({
              weekday: String(entry.weekday),
              time: entry.time,
            }))
          : [{ weekday: "1", time: "" }],
      );
      setOneTimeDate(selectedService.oneTimeDate ?? "");
      setOneTimeTime(selectedService.oneTimeTime ?? "");
      setSlotMode(selectedService.slotMode ?? "shared_capacity");
      setSlotIntervalMinutes(selectedService.slotIntervalMinutes ? String(selectedService.slotIntervalMinutes) : "");
      setSlotDefinitions(
        selectedService.slotDefinitions?.length
          ? selectedService.slotDefinitions.map((slot) => ({
              time: slot.time,
              capacity: slot.capacity ? String(slot.capacity) : "",
            }))
          : [{ time: "", capacity: "" }],
      );
      setAttendeeVisibility(selectedService.attendeeVisibility ?? true);
      setDefaultLocation(selectedService.defaultLocation ?? "");
      setDefaultVideoLink("");
      setServiceIsActive(selectedService.isActive ?? true);
    }
  }, [active, selectedService]);

  const filteredGuardians = useMemo(() => {
    const guardians = users.filter((user) => user.role === "guardian");
    const query = guardianSearch.trim().toLowerCase();
    if (!query) return guardians;
    return guardians.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      const athlete = user.athleteName?.toLowerCase() ?? "";
      return name.includes(query) || email.includes(query) || athlete.includes(query);
    });
  }, [guardianSearch, users]);

  const suggestionGuardians = useMemo(() => {
    if (!guardianSearch.trim() || !showGuardianSuggestions) return [];
    return filteredGuardians.slice(0, 6);
  }, [filteredGuardians, guardianSearch, showGuardianSuggestions]);

  const calendarDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const dayMap = new Map<string, { date: Date; items: typeof bookings }>();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dayMap.set(getDateKey(date), { date, items: [] });
    }
    bookings.forEach((booking) => {
      if (!booking.startsAt) return;
      const startsAt = new Date(booking.startsAt);
      if (Number.isNaN(startsAt.getTime())) return;
      if (startsAt < start || startsAt > end) return;
      const key = getDateKey(startsAt);
      const day = dayMap.get(key);
      if (day) {
        day.items.push(booking);
      }
    });
    return Array.from(dayMap.values()).map((day) => ({
      ...day,
      items: [...day.items].sort((a, b) => {
        const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
        const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
        return aTime - bTime;
      }),
    }));
  }, [bookings]);

  const totalWeekBookings = useMemo(
    () => calendarDays.reduce((count, day) => count + day.items.length, 0),
    [calendarDays],
  );

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {active === "new-service" && "Create New Service"}
            {active === "edit-service" && "Edit Service"}
            {active === "calendar" && "Calendar View"}
            {active === "booking-details" && "Booking Details"}
          </DialogTitle>
          <DialogDescription>
            {selectedBooking
              ? `${selectedBooking.name} • ${selectedBooking.athlete}`
              : "Manage scheduling actions."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4">
          {active === "new-service" || active === "edit-service" ? (
            <>
              <Input
                placeholder="Service name"
                value={serviceName}
                onChange={(e) => {
                  setServiceName(e.target.value);
                  setError(null);
                }}
              />
              <Select
                value={serviceType}
                onChange={(e) => {
                  setServiceType(e.target.value);
                  setError(null);
                }}
              >
                <option value="call">Call</option>
                <option value="group_call">Group Call</option>
                <option value="individual_call">Individual Call</option>
                <option value="lift_lab_1on1">Lift Lab 1:1</option>
                <option value="role_model">Role Model (Premium)</option>
              </Select>
              <Input
                placeholder="Duration (mins)"
                value={durationMinutes}
                onChange={(e) => {
                  setDurationMinutes(e.target.value);
                  setError(null);
                }}
              />
              <div className="space-y-1">
                <Input
                  placeholder="Slots available"
                  value={capacity}
                  onChange={(e) => {
                    setCapacity(e.target.value);
                    setError(null);
                  }}
                />
                <div className="text-xs text-muted-foreground">
                  Capacity is used for shared-capacity services and can also backfill exact slots.
                </div>
              </div>
              <div className="space-y-2 rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-sm font-semibold text-foreground">Eligible plans</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { value: "PHP", label: "PHP" },
                    { value: "PHP_Plus", label: "PHP Plus" },
                    { value: "PHP_Premium", label: "PHP Premium" },
                  ].map((plan) => (
                    <label key={plan.value} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={eligiblePlans.includes(plan.value)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setEligiblePlans((current) => [...new Set([...current, plan.value])]);
                          } else {
                            setEligiblePlans((current) => current.filter((item) => item !== plan.value));
                          }
                        }}
                      />
                      {plan.label}
                    </label>
                  ))}
                </div>
              </div>
              <Select value={schedulePattern} onChange={(e) => setSchedulePattern(e.target.value)}>
                <option value="one_time">One-time service</option>
                <option value="weekly_recurring">Weekly recurring</option>
              </Select>
              {schedulePattern === "one_time" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="date" value={oneTimeDate} onChange={(e) => setOneTimeDate(e.target.value)} />
                  <Input type="time" value={oneTimeTime} onChange={(e) => setOneTimeTime(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Weekly schedule</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWeeklyEntries((current) => [...current, { weekday: "1", time: "" }])}
                    >
                      Add day
                    </Button>
                  </div>
                  {weeklyEntries.map((entry, index) => (
                    <div key={`weekly-${index}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Select
                        value={entry.weekday}
                        onChange={(e) =>
                          setWeeklyEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, weekday: e.target.value } : item,
                            ),
                          )
                        }
                      >
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                        <option value="7">Sunday</option>
                      </Select>
                      <Input
                        type="time"
                        value={entry.time}
                        onChange={(e) =>
                          setWeeklyEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, time: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={weeklyEntries.length === 1}
                        onClick={() =>
                          setWeeklyEntries((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select value={recurrenceEndMode} onChange={(e) => setRecurrenceEndMode(e.target.value)}>
                      <option value="forever">Repeat until disabled</option>
                      <option value="weeks">Repeat for weeks</option>
                      <option value="months">Repeat for months</option>
                    </Select>
                    {recurrenceEndMode === "forever" ? null : (
                      <Input
                        type="number"
                        min={1}
                        placeholder={recurrenceEndMode === "weeks" ? "Number of weeks" : "Number of months"}
                        value={recurrenceCount}
                        onChange={(e) => setRecurrenceCount(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              )}
              <Select value={slotMode} onChange={(e) => setSlotMode(e.target.value)}>
                <option value="shared_capacity">Shared capacity</option>
                <option value="exact_sub_slots">Exact sub-slots</option>
                <option value="both">Both shared and exact slots</option>
              </Select>
              {slotMode === "shared_capacity" ? null : (
                <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Bookable slots</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSlotDefinitions((current) => [...current, { time: "", capacity: "" }])}
                    >
                      Add slot
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Slot interval in minutes (optional)"
                    value={slotIntervalMinutes}
                    onChange={(e) => setSlotIntervalMinutes(e.target.value)}
                  />
                  {slotDefinitions.map((slot, index) => (
                    <div key={`slot-${index}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        type="time"
                        value={slot.time}
                        onChange={(e) =>
                          setSlotDefinitions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, time: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Input
                        type="number"
                        min={1}
                        placeholder="Capacity"
                        value={slot.capacity}
                        onChange={(e) =>
                          setSlotDefinitions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, capacity: e.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={slotDefinitions.length === 1}
                        onClick={() =>
                          setSlotDefinitions((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={attendeeVisibility}
                  onChange={(e) => setAttendeeVisibility(e.target.checked)}
                />
                Show attendee list for group calls
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={serviceIsActive}
                  onChange={(e) => setServiceIsActive(e.target.checked)}
                />
                Service is active (shown to clients while capacity remains)
              </label>
              <Input
                placeholder="Default location (optional)"
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
              />
              {/* Default video link removed */}
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setError(null);
                    if (!serviceName.trim()) {
                      setError("Service name is required.");
                      return;
                    }
                    if (!durationMinutes) {
                      setError("Duration is required.");
                      return;
                    }
                    if (schedulePattern === "one_time" && (!oneTimeDate || !oneTimeTime)) {
                      setError("Set the one-time date and time.");
                      return;
                    }
                    if (
                      schedulePattern === "weekly_recurring" &&
                      weeklyEntries.some((entry) => !entry.weekday || !entry.time)
                    ) {
                      setError("Each weekly row needs a day and time.");
                      return;
                    }
                    if (recurrenceEndMode !== "forever" && !recurrenceCount) {
                      setError("Set how long the recurring service should run.");
                      return;
                    }
                    if (slotMode !== "shared_capacity" && slotDefinitions.some((slot) => !slot.time && !slot.capacity)) {
                      setError("Each slot row needs at least a time.");
                      return;
                    }
                    try {
                      const normalizedEligiblePlans =
                        serviceType === "role_model"
                          ? ["PHP_Premium"]
                          : eligiblePlans;
                      const weeklyPayload = weeklyEntries
                        .filter((entry) => entry.time)
                        .map((entry) => ({ weekday: Number(entry.weekday), time: entry.time }));
                      const slotPayload = slotDefinitions
                        .filter((slot) => slot.time)
                        .map((slot) => ({
                          time: slot.time,
                          capacity: slot.capacity ? Number(slot.capacity) : undefined,
                        }));
                      const payload = {
                        name: serviceName,
                        type: serviceType,
                        durationMinutes: Number(durationMinutes),
                        capacity: capacity ? Number(capacity) : undefined,
                        attendeeVisibility,
                        defaultLocation: defaultLocation || undefined,
                        defaultMeetingLink: undefined,
                        programTier: serviceType === "role_model" ? "PHP_Premium" : programTier || undefined,
                        eligiblePlans: normalizedEligiblePlans,
                        schedulePattern,
                        recurrenceEndMode: schedulePattern === "weekly_recurring" ? recurrenceEndMode : undefined,
                        recurrenceCount:
                          schedulePattern === "weekly_recurring" && recurrenceEndMode !== "forever" && recurrenceCount
                            ? Number(recurrenceCount)
                            : undefined,
                        weeklyEntries: schedulePattern === "weekly_recurring" ? weeklyPayload : undefined,
                        oneTimeDate: schedulePattern === "one_time" ? oneTimeDate : undefined,
                        oneTimeTime: schedulePattern === "one_time" ? oneTimeTime : undefined,
                        slotMode,
                        slotIntervalMinutes: slotIntervalMinutes ? Number(slotIntervalMinutes) : undefined,
                        slotDefinitions: slotMode === "shared_capacity" ? undefined : slotPayload,
                        isActive: serviceIsActive,
                      };
                      if (active === "new-service") {
                        await createService(payload).unwrap();
                      } else if (active === "edit-service" && selectedService) {
                        await updateService({
                          id: selectedService.id,
                          data: payload,
                        }).unwrap();
                      }
                      onRefresh?.();
                      onClose();
                    } catch (err: unknown) {
                      console.error("Service save error:", err);
                      setError(getRtkErrorMessage(err, "Failed to save service."));
                    }
                  }}
                  disabled={isCreatingService || isUpdatingService}
                >
                  {active === "edit-service" ? "Save Changes" : "Create"}
                </Button>
              </div>
            </>
          ) : null}
          {active === "new-booking" ? (
            <>
              <Input
                placeholder="Search guardians"
                value={guardianSearch}
                onChange={(e) => {
                  setGuardianSearch(e.target.value);
                  setShowGuardianSuggestions(true);
                }}
                onFocus={() => {
                  if (guardianSearch.trim()) setShowGuardianSuggestions(true);
                }}
              />
              {suggestionGuardians.length > 0 ? (
                <div className="rounded-xl border border-border bg-background shadow-sm">
                  {suggestionGuardians.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setBookingUserId(String(user.id));
                        setGuardianSearch(user.name ?? user.email ?? "");
                        setShowGuardianSuggestions(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-secondary/50"
                    >
                      <span>
                        {user.name ?? user.email ?? `User #${user.id}`}
                        {user.athleteName ? ` • ${user.athleteName}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">Select</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <Select value={bookingUserId} onChange={(e) => setBookingUserId(e.target.value)}>
                <option value="">Select guardian</option>
                {filteredGuardians.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.name ?? user.email ?? `User #${user.id}`}
                    {user.athleteName ? ` • ${user.athleteName}` : ""}
                  </option>
                ))}
              </Select>
              <Select value={bookingServiceId} onChange={(e) => setBookingServiceId(e.target.value)}>
                <option value="">Service type</option>
                {services.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="date" placeholder="Date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="Hour"
                    value={bookingHour}
                    onChange={(e) => setBookingHour(e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="Min"
                    value={bookingMinute}
                    onChange={(e) => setBookingMinute(e.target.value)}
                  />
                </div>
              </div>
              <Select value={bookingStatus} onChange={(e) => setBookingStatus(e.target.value)}>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="declined">Declined</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Input
                placeholder="Location (optional)"
                value={bookingLocation}
                onChange={(e) => setBookingLocation(e.target.value)}
              />
              <Input
                placeholder="Meeting link (optional)"
                value={bookingMeetingLink}
                onChange={(e) => setBookingMeetingLink(e.target.value)}
              />
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setError(null);
                    if (!bookingUserId || !bookingServiceId) {
                      setError("Select a guardian and service.");
                      return;
                    }
                    if (!bookingDate || !bookingHour || !bookingMinute) {
                      setError("Select a date and time.");
                      return;
                    }
                    const pad = (value: string) => value.padStart(2, "0");
                    const startsAt = new Date(`${bookingDate}T${pad(bookingHour)}:${pad(bookingMinute)}:00`);
                    if (Number.isNaN(startsAt.getTime())) {
                      setError("Invalid date or time.");
                      return;
                    }
                    const service = services.find((item) => String(item.id) === bookingServiceId);
                    const duration = service?.durationMinutes ?? 0;
                    if (!duration) {
                      setError("Selected service has no duration.");
                      return;
                    }
                    const endsAt = new Date(startsAt.getTime() + duration * 60000);
                    try {
                      await createAdminBooking({
                        userId: Number(bookingUserId),
                        serviceTypeId: Number(bookingServiceId),
                        startsAt: startsAt.toISOString(),
                        endsAt: endsAt.toISOString(),
                        location: bookingLocation || undefined,
                        meetingLink: bookingMeetingLink || undefined,
                        status: bookingStatus,
                      }).unwrap();
                      onRefresh?.();
                      onClose();
                    } catch (err: unknown) {
                      setError(getRtkErrorMessage(err, "Failed to create booking"));
                    }
                  }}
                  disabled={isCreatingBooking}
                >
                  Create Booking
                </Button>
              </div>
            </>
          ) : null}
          {active === "calendar" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
                <div>
                  <p className="text-sm font-semibold text-foreground">Next 7 days</p>
                  <p className="text-xs text-muted-foreground">
                    {totalWeekBookings} booking{totalWeekBookings === 1 ? "" : "s"} scheduled.
                  </p>
                </div>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {formatDate(new Date())}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {calendarDays.map((day) => (
                  <div
                    key={getDateKey(day.date)}
                    className="rounded-2xl border border-border bg-secondary/20 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{formatDay(day.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                      </div>
                      <Badge variant="accent">{day.items.length}</Badge>
                    </div>
                    <div className="mt-3 space-y-3">
                      {day.items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                          No bookings.
                        </div>
                      ) : (
                        day.items.map((booking) => {
                          const startsAt = booking.startsAt ? new Date(booking.startsAt) : null;
                          const statusKey = booking.status ?? "confirmed";
                          return (
                            <div
                              key={`${booking.id}-${booking.startsAt}`}
                              className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-foreground">
                                  {startsAt ? formatTime(startsAt) : booking.time}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={STATUS_STYLES[statusKey] ?? "border-border text-muted-foreground"}
                                >
                                  {STATUS_LABELS[statusKey] ?? "Scheduled"}
                                </Badge>
                              </div>
                              <p className="mt-1 text-[13px] text-foreground">
                                {BOOKING_TYPE_LABELS[booking.type] ?? booking.name}
                              </p>
                              <p className="text-muted-foreground">{booking.athlete}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {bookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
                  No bookings found yet. Create a booking to populate the calendar.
                </div>
              ) : null}
            </div>
          ) : null}
          {active === "booking-details" && selectedBooking ? (
            <>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-semibold text-foreground">{selectedBooking.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.athlete} • {selectedBooking.time} • {selectedBooking.type}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm space-y-2">
                <div>Status: {selectedBooking.status ?? "unknown"}</div>
                <div>
                  Starts:{" "}
                  {selectedBooking.startsAt
                    ? new Date(selectedBooking.startsAt).toLocaleString()
                    : "--"}
                </div>
                <div>
                  Ends:{" "}
                  {selectedBooking.endTime
                    ? new Date(selectedBooking.endTime).toLocaleString()
                    : "--"}
                </div>
                <div>Location: {selectedBooking.location ?? "None"}</div>
                <div>Meeting link: {selectedBooking.meetingLink ?? "None"}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {selectedBooking.status === "pending" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setError(null);
                        if (!onDeclineBooking) return;
                        try {
                          await onDeclineBooking(selectedBooking.id);
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : "Failed to decline booking");
                        }
                      }}
                      disabled={isApproving}
                    >
                      Decline Booking
                    </Button>
                    <Button
                      onClick={async () => {
                        setError(null);
                        if (!onApproveBooking) return;
                        try {
                          await onApproveBooking(selectedBooking.id);
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : "Failed to approve booking");
                        }
                      }}
                      disabled={isApproving}
                    >
                      Approve Booking
                    </Button>
                  </>
                ) : null}
              </div>
              {error ? (
                <div className="text-sm text-red-500">{error}</div>
              ) : null}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
