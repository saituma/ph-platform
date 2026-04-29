"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "../../ui/dialog";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useCreateAdminBookingMutation,
  useGetAdminTeamsQuery,
} from "@/lib/apiSlice";
import { cn } from "@/lib/utils";

export type BookingsDialog =
  | null
  | "new-service"
  | "edit-service"
  | "new-booking"
  | "calendar"
  | "booking-details";

function getRtkErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (
      err as {
        data?: {
          error?: string;
          issues?: { path: string[]; message: string }[];
        };
      }
    ).data;
    if (data?.error === "Invalid request" && Array.isArray(data.issues)) {
      return data.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" | ");
    }
    if (typeof data?.error === "string") return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type ServiceType = {
  id: number;
  name: string;
  description?: string | null;
  type?: string | null;
  durationMinutes: number;
  isBookable?: boolean | null;
  capacity?: number | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  eligiblePlans?: string[] | null;
  eligibleTargets?: string[] | null;
  schedulePattern?: string | null;
  recurrenceEndMode?: string | null;
  recurrenceCount?: number | null;
  weeklyEntries?: { weekday: number; time: string }[] | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  slotMode?: string | null;
  slotIntervalMinutes?: number | null;
  slotDefinitions?: { time: string; capacity?: number | null }[] | null;
  totalSlots?: number | null;
  isActive?: boolean | null;
};

type BookingsDialogsProps = {
  active: BookingsDialog;
  onClose: () => void;
  bookings?: {
    id: number;
    serviceTypeId?: number | null;
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
    serviceTypeId?: number | null;
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
  users?: {
    id: number;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    athleteName?: string | null;
  }[];
  selectedService?: ServiceType | null;
  onRefresh?: () => void;
  onApproveBooking?: (input: {
    bookingId: number;
    startsAt: string;
    endTime?: string;
    meetingLink?: string | null;
  }) => Promise<void>;
  onDeclineBooking?: (bookingId: number) => Promise<void>;
  isApproving?: boolean;
};

export const BOOKING_TYPE_LABELS: Record<string, string> = {
  one_to_one: "1-to-1 session",
  semi_private: "Semi-private session",
  in_person: "In-person session",
};

const PROGRAM_TIERS = [
  { label: "PHP", value: "PHP" },
  { label: "PHP Pro", value: "PHP_Pro" },
  { label: "PHP Premium", value: "PHP_Premium" },
  { label: "PHP Premium Plus", value: "PHP_Premium_Plus" },
];

const TARGET_AUDIENCES = [
  { label: "Youth Athletes", value: "youth" },
  { label: "Adult Athletes", value: "adult" },
];

const SERVICE_TYPE_ITEMS = [
  { label: "1-to-1 session", value: "one_to_one" },
  { label: "Semi-private session", value: "semi_private" },
  { label: "In-person session", value: "in_person" },
];

const BOOKING_STATUS_ITEMS = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Pending", value: "pending" },
  { label: "Declined", value: "declined" },
  { label: "Cancelled", value: "cancelled" },
];

const WEEKDAY_ITEMS = [
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
  { label: "Sunday", value: "0" },
];

const HOUR_ITEMS = Array.from({ length: 24 }, (_, i) => ({
  label: String(i).padStart(2, "0"),
  value: String(i).padStart(2, "0"),
}));

const MINUTE_ITEMS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(
  (m) => ({ label: m, value: m }),
);

function getNextSevenDays(): { label: string; value: string }[] {
  const days: { label: string; value: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.push({ label, value: `${yyyy}-${mm}-${dd}` });
  }
  return days;
}

type ServiceAudienceMode = "all_clients" | "non_team" | "team_all" | "team_specific";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  requested: "Requested",
  declined: "Declined",
  cancelled: "Cancelled",
};

function statusBadgeVariant(statusKey: string) {
  switch (statusKey) {
    case "confirmed":
      return "success" as const;
    case "pending":
    case "requested":
      return "warning" as const;
    case "declined":
      return "error" as const;
    case "cancelled":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

const pad = (value: number) => String(value).padStart(2, "0");

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatDay = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "short" });

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const DEFAULT_SERVICE_DURATION_MINUTES: Record<string, number> = {
  one_to_one: 60,
  semi_private: 75,
  in_person: 60,
};

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
  const [serviceDescription, setServiceDescription] = useState("");
  const [isBookable, setIsBookable] = useState(true);
  const [serviceType, setServiceType] = useState("one_to_one");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [slotsAvailable, setSlotsAvailable] = useState("");
  const [newServiceSchedule, setNewServiceSchedule] = useState<"permanent" | "one_time">("one_time");
  const [newServiceWeekday, setNewServiceWeekday] = useState<string>("1");
  const [newServiceWeekHour, setNewServiceWeekHour] = useState<string>("09");
  const [newServiceWeekMinute, setNewServiceWeekMinute] = useState<string>("00");
  const [newServiceOneTimeDate, setNewServiceOneTimeDate] = useState<string>("");
  const [newServiceOneTimeHour, setNewServiceOneTimeHour] = useState<string>("09");
  const [newServiceOneTimeMinute, setNewServiceOneTimeMinute] = useState<string>("00");
  const [eligiblePlans, setEligiblePlans] = useState<string[]>([]);
  const [eligibleTargets, setEligibleTargets] = useState<string[]>([]);
  const [audienceMode, setAudienceMode] = useState<ServiceAudienceMode>("non_team");
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

  const { data: teamsData } = useGetAdminTeamsQuery();
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
  const [isApprovePromptOpen, setIsApprovePromptOpen] = useState(false);
  const [approveDate, setApproveDate] = useState("");
  const [approveHour, setApproveHour] = useState("");
  const [approveMinute, setApproveMinute] = useState("");
  const [approveLocation, setApproveLocation] = useState("");
  const [approveMeetingLink, setApproveMeetingLink] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createService, { isLoading: isCreatingService }] =
    useCreateServiceMutation();
  const [updateService, { isLoading: isUpdatingService }] =
    useUpdateServiceMutation();
  const [createAdminBooking, { isLoading: isCreatingBooking }] =
    useCreateAdminBookingMutation();

  useEffect(() => {
    if (!isApprovePromptOpen) return;
    setApproveError(null);
    setApproveDate("");
    setApproveHour("");
    setApproveMinute("");

    const service =
      selectedBooking?.serviceTypeId != null
        ? services.find((item) => item.id === selectedBooking.serviceTypeId)
        : undefined;

    setApproveLocation(
      selectedBooking?.location ?? service?.defaultLocation ?? "",
    );
    setApproveMeetingLink(
      selectedBooking?.meetingLink ?? service?.defaultMeetingLink ?? "",
    );
  }, [isApprovePromptOpen, selectedBooking, services]);

  useEffect(() => {
    if (active === "new-service") {
      setServiceName("");
      setServiceDescription("");
      setIsBookable(true);
      setServiceType("one_to_one");
      setDurationMinutes(String(DEFAULT_SERVICE_DURATION_MINUTES.one_to_one));
      setSlotsAvailable("");
      setEligiblePlans([]);
      setEligibleTargets([]);
      setAudienceMode("non_team");
      setSelectedTeamIds([]);
      setNewServiceSchedule("one_time");
      setNewServiceWeekday("1");
      setNewServiceWeekHour("09");
      setNewServiceWeekMinute("00");
      setNewServiceOneTimeDate("");
      setNewServiceOneTimeHour("09");
      setNewServiceOneTimeMinute("00");
      setError(null);
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
      setServiceDescription(selectedService.description ?? "");
      setIsBookable(selectedService.isBookable !== false);
      setServiceType(selectedService.type ?? "one_to_one");
      setDurationMinutes(String(selectedService.durationMinutes ?? 30));
      setSlotsAvailable(selectedService.totalSlots != null ? String(selectedService.totalSlots) : "");
      setEligiblePlans(selectedService.eligiblePlans ?? []);

      const targets = selectedService.eligibleTargets ?? [];
      const teamTokenValues = targets
        .filter((t) => t.startsWith("team:"))
        .map((t) => t.slice(5));
      const nonTeamVals = targets.filter((t) => !t.startsWith("team:"));

      const teams = teamsData?.teams ?? [];
      const allTeamIds = teams
        .map((r) => (typeof r.id === "number" && Number.isFinite(r.id) ? r.id : Number(r.id)))
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b);

      const resolvedIds: number[] = [];
      for (const tv of teamTokenValues) {
        if (/^\d+$/.test(tv)) {
          resolvedIds.push(Number(tv));
        } else {
          const row = teams.find((x) => x.team === tv);
          const rid = row && typeof row.id === "number" ? row.id : row ? Number(row.id) : NaN;
          if (Number.isFinite(rid)) resolvedIds.push(rid);
        }
      }
      const uniqSorted = [...new Set(resolvedIds)].sort((a, b) => a - b);
      const isAllTeams =
        teamTokenValues.length > 0 &&
        allTeamIds.length > 0 &&
        uniqSorted.length === allTeamIds.length &&
        uniqSorted.every((id, i) => id === allTeamIds[i]);

      if (teamTokenValues.length > 0) {
        if (isAllTeams) {
          setAudienceMode("team_all");
          setEligibleTargets([]);
          setSelectedTeamIds([]);
        } else {
          setAudienceMode("team_specific");
          setEligibleTargets([]);
          setSelectedTeamIds(uniqSorted);
        }
      } else if (nonTeamVals.includes("all")) {
        setAudienceMode("all_clients");
        setEligibleTargets([]);
        setSelectedTeamIds([]);
      } else {
        setAudienceMode("non_team");
        setEligibleTargets(nonTeamVals);
        setSelectedTeamIds([]);
      }

      setError(null);
    }
  }, [active, selectedService, teamsData]);

  const filteredGuardians = useMemo(() => {
    const guardians = users.filter((user) => user.role === "guardian");
    const query = guardianSearch.trim().toLowerCase();
    if (!query) return guardians;
    return guardians.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const email = user.email?.toLowerCase() ?? "";
      const athlete = user.athleteName?.toLowerCase() ?? "";
      return (
        name.includes(query) || email.includes(query) || athlete.includes(query)
      );
    });
  }, [guardianSearch, users]);

  const suggestionGuardians = useMemo(() => {
    if (!guardianSearch.trim() || !showGuardianSuggestions) return [];
    return filteredGuardians.slice(0, 6);
  }, [filteredGuardians, guardianSearch, showGuardianSuggestions]);

  const teamsWithIds = useMemo(() => {
    const raw = teamsData?.teams ?? [];
    return raw
      .map((row) => {
        const id =
          typeof row.id === "number" && Number.isFinite(row.id)
            ? row.id
            : Number((row as { id?: unknown }).id);
        if (!Number.isFinite(id)) return null;
        return { id, team: row.team };
      })
      .filter((r): r is { id: number; team: string } => r !== null)
      .sort((a, b) => a.team.localeCompare(b.team));
  }, [teamsData]);

  const teamAudience =
    audienceMode === "all_clients" ||
    audienceMode === "team_all" ||
    audienceMode === "team_specific";

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

  const isServiceForm = active === "new-service" || active === "edit-service";

  // Build the guardian select items from filtered list
  const guardianSelectItems = useMemo(
    () =>
      filteredGuardians.map((user) => ({
        label: `${user.name ?? user.email ?? `User #${user.id}`}${user.athleteName ? ` • ${user.athleteName}` : ""}`,
        value: String(user.id),
      })),
    [filteredGuardians],
  );

  const serviceSelectItems = useMemo(
    () =>
      services.map((service) => ({
        label: service.name,
        value: String(service.id),
      })),
    [services],
  );

  return (
    <Dialog open={active !== null} onOpenChange={onClose}>
      <DialogPopup
        className={cn(
          isServiceForm &&
            "max-h-[min(90vh,720px)] sm:max-w-lg",
        )}
      >
        <DialogHeader
          className={cn(isServiceForm && "border-b border-border pb-4")}
        >
          <DialogTitle>
            {active === "new-service" && "Create New Service"}
            {active === "edit-service" && "Edit Service"}
            {active === "new-booking" && "Create Booking"}
            {active === "calendar" && "Calendar View"}
            {active === "booking-details" && "Booking Details"}
          </DialogTitle>
          <DialogDescription>
            {active === "new-service" &&
              "Set name, type, schedule, audience, and available slots."}
            {active === "edit-service" &&
              "Update audience, schedule, and available slots."}
            {active === "new-booking" && "Choose a guardian, service, and time."}
            {active === "calendar" && "Bookings scheduled for the next seven days."}
            {active === "booking-details" && selectedBooking
              ? `${selectedBooking.name} • ${selectedBooking.athlete}`
              : active === "booking-details"
                ? "Review this booking."
                : null}
          </DialogDescription>
        </DialogHeader>

        {isServiceForm ? (
          <>
            <DialogPanel className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="service-name">Name</Label>
                <Input
                  id="service-name"
                  placeholder="Service name"
                  value={serviceName}
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    setError(null);
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  placeholder="What is this service for?"
                  value={serviceDescription}
                  onChange={(e) => {
                    setServiceDescription(e.target.value);
                    setError(null);
                  }}
                />
              </div>

              {/* Bookable toggle */}
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label>Booking mode</Label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="booking-mode"
                      checked={isBookable}
                      onChange={() => setIsBookable(true)}
                    />
                    <span>
                      <span className="font-medium">Bookable</span>
                      <span className="block text-xs text-muted-foreground">Athletes can request to book this service.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="booking-mode"
                      checked={!isBookable}
                      onChange={() => setIsBookable(false)}
                    />
                    <span>
                      <span className="font-medium">Non-bookable</span>
                      <span className="block text-xs text-muted-foreground">Visible on schedule but athletes cannot book it.</span>
                    </span>
                  </label>
                </div>
              </div>

              {isBookable ? (
              <div className="space-y-1">
                <Label htmlFor="service-type">Type</Label>
                <Select
                  items={SERVICE_TYPE_ITEMS}
                  value={serviceType}
                  onValueChange={(nextType) => {
                    const type = nextType ?? "one_to_one";
                    setServiceType(type);
                    if (active === "new-service") {
                      setDurationMinutes(
                        String(
                          DEFAULT_SERVICE_DURATION_MINUTES[type] ??
                            DEFAULT_SERVICE_DURATION_MINUTES.one_to_one,
                        ),
                      );
                    }
                    setError(null);
                  }}
                >
                  <SelectTrigger id="service-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {SERVICE_TYPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
              ) : null}

              {/* Schedule type */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <Label>Schedule</Label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="schedule-type"
                      checked={newServiceSchedule === "one_time"}
                      onChange={() => setNewServiceSchedule("one_time")}
                    />
                    <span className="font-medium">Temporary</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="schedule-type"
                      checked={newServiceSchedule === "permanent"}
                      onChange={() => setNewServiceSchedule("permanent")}
                    />
                    <span className="font-medium">Permanent</span>
                  </label>
                </div>

                {newServiceSchedule === "permanent" ? (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Day of week</Label>
                      <Select
                        items={WEEKDAY_ITEMS}
                        value={newServiceWeekday}
                        onValueChange={(v) => setNewServiceWeekday(v ?? "1")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {WEEKDAY_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Time</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          items={HOUR_ITEMS}
                          value={newServiceWeekHour}
                          onValueChange={(v) => setNewServiceWeekHour(v ?? "09")}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {HOUR_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                        <span className="text-muted-foreground">:</span>
                        <Select
                          items={MINUTE_ITEMS}
                          value={newServiceWeekMinute}
                          onValueChange={(v) => setNewServiceWeekMinute(v ?? "00")}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {MINUTE_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      {(() => {
                        const nextSevenDays = getNextSevenDays();
                        return (
                          <Select
                            items={nextSevenDays}
                            value={newServiceOneTimeDate}
                            onValueChange={(v) => setNewServiceOneTimeDate(v ?? "")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select date" />
                            </SelectTrigger>
                            <SelectPopup>
                              {nextSevenDays.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectPopup>
                          </Select>
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Time</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          items={HOUR_ITEMS}
                          value={newServiceOneTimeHour}
                          onValueChange={(v) => setNewServiceOneTimeHour(v ?? "09")}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {HOUR_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                        <span className="text-muted-foreground">:</span>
                        <Select
                          items={MINUTE_ITEMS}
                          value={newServiceOneTimeMinute}
                          onValueChange={(v) => setNewServiceOneTimeMinute(v ?? "00")}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {MINUTE_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Audience selector */}
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label>Audience</Label>
                <p className="text-xs text-muted-foreground">
                  Choose who can see this service.
                </p>
                <div className="space-y-2 pt-1">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="service-audience"
                      className="mt-1"
                      checked={audienceMode === "all_clients"}
                      onChange={() => {
                        setAudienceMode("all_clients");
                        setEligibleTargets([]);
                        setSelectedTeamIds([]);
                        setEligiblePlans([]);
                      }}
                    />
                    <span>
                      <span className="font-medium text-foreground">All Clients</span>
                      <span className="block text-muted-foreground">
                        Every registered client can see this service — no age or tier filter.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="service-audience"
                      className="mt-1"
                      checked={audienceMode === "non_team"}
                      onChange={() => {
                        setAudienceMode("non_team");
                        setSelectedTeamIds([]);
                        setEligibleTargets([]);
                      }}
                    />
                    <span>
                      <span className="font-medium text-foreground">Non-team</span>
                      <span className="block text-muted-foreground">
                        Program athletes filtered by age group and eligible plan tier.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="service-audience"
                      className="mt-1"
                      checked={audienceMode === "team_all"}
                      onChange={() => {
                        setAudienceMode("team_all");
                        setEligibleTargets([]);
                        setSelectedTeamIds([]);
                        setEligiblePlans([]);
                      }}
                    />
                    <span>
                      <span className="font-medium text-foreground">All teams</span>
                      <span className="block text-muted-foreground">
                        Any athlete currently on any team roster can book.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="service-audience"
                      className="mt-1"
                      checked={audienceMode === "team_specific"}
                      onChange={() => {
                        setAudienceMode("team_specific");
                        setEligibleTargets([]);
                        setEligiblePlans([]);
                      }}
                    />
                    <span>
                      <span className="font-medium text-foreground">Specific teams</span>
                      <span className="block text-muted-foreground">
                        Only athletes on the teams you select below.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {audienceMode === "non_team" ? (
                <div className="space-y-2">
                  <Label>Age group</Label>
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    {TARGET_AUDIENCES.map((target) => (
                      <label key={target.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={eligibleTargets.includes(target.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEligibleTargets([...eligibleTargets, target.value]);
                            } else {
                              setEligibleTargets(eligibleTargets.filter((t) => t !== target.value));
                            }
                          }}
                        />
                        {target.label}
                      </label>
                    ))}
                    <p className="pt-1 text-xs text-muted-foreground">
                      Leave both unchecked to allow all program athletes regardless of age.
                    </p>
                  </div>
                </div>
              ) : null}

              {audienceMode === "team_specific" ? (
                <div className="space-y-2">
                  <Label>Teams</Label>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                    {teamsWithIds.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No teams yet. Create a team under admin first.
                      </p>
                    ) : (
                      teamsWithIds.map((row) => (
                        <label key={row.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedTeamIds.includes(row.id)}
                            onChange={() => {
                              setSelectedTeamIds((prev) =>
                                prev.includes(row.id)
                                  ? prev.filter((x) => x !== row.id)
                                  : [...prev, row.id],
                              );
                            }}
                          />
                          {row.team}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {!teamAudience ? (
                <div className="space-y-2">
                  <Label>Eligible tiers</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
                    {PROGRAM_TIERS.map((tier) => (
                      <label key={tier.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={eligiblePlans.includes(tier.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEligiblePlans([...eligiblePlans, tier.value]);
                            } else {
                              setEligiblePlans(eligiblePlans.filter((p) => p !== tier.value));
                            }
                          }}
                        />
                        {tier.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {isBookable ? (
              <div className="space-y-1">
                <Label htmlFor="slots-available">Slots available</Label>
                <Input
                  id="slots-available"
                  type="number"
                  min={1}
                  placeholder="Unlimited (leave empty)"
                  value={slotsAvailable}
                  onChange={(e) => setSlotsAvailable(e.target.value)}
                />
              </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </DialogPanel>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setError(null);
                  if (!serviceName.trim()) {
                    setError("Service name is required.");
                    return;
                  }
                  if (audienceMode === "team_specific" && selectedTeamIds.length === 0) {
                    setError("Select at least one team.");
                    return;
                  }
                  if (audienceMode === "team_all" && teamsWithIds.length === 0) {
                    setError(
                      "No teams exist yet. Use All Clients or create teams first.",
                    );
                    return;
                  }
                  try {
                    const duration = Number(durationMinutes);
                    const fallbackDuration =
                      DEFAULT_SERVICE_DURATION_MINUTES[serviceType] ??
                      DEFAULT_SERVICE_DURATION_MINUTES.one_to_one;
                    const schedulePayload =
                      active === "edit-service" && selectedService
                        ? {
                            schedulePattern: selectedService.schedulePattern ?? "one_time",
                            weeklyEntries: Array.isArray(selectedService.weeklyEntries)
                              ? selectedService.weeklyEntries
                              : [],
                            oneTimeDate: selectedService.oneTimeDate ?? null,
                            oneTimeTime: selectedService.oneTimeTime ?? null,
                            slotMode: selectedService.slotMode ?? "shared_capacity",
                            slotIntervalMinutes: selectedService.slotIntervalMinutes ?? null,
                            slotDefinitions: Array.isArray(selectedService.slotDefinitions)
                              ? selectedService.slotDefinitions
                              : [],
                          }
                        : newServiceSchedule === "permanent"
                          ? {
                              schedulePattern: "weekly_recurring" as const,
                              weeklyEntries: [{ weekday: Number(newServiceWeekday), time: `${newServiceWeekHour}:${newServiceWeekMinute}` }] as { weekday: number; time: string }[],
                              oneTimeDate: null,
                              oneTimeTime: null,
                              slotMode: "shared_capacity",
                              slotIntervalMinutes: null,
                              slotDefinitions: [] as { time: string; capacity?: number }[],
                            }
                          : {
                              schedulePattern: "one_time" as const,
                              weeklyEntries: [] as { weekday: number; time: string }[],
                              oneTimeDate: newServiceOneTimeDate || null,
                              oneTimeTime: newServiceOneTimeDate ? `${newServiceOneTimeHour}:${newServiceOneTimeMinute}` : null,
                              slotMode: "shared_capacity",
                              slotIntervalMinutes: null,
                              slotDefinitions: [] as { time: string; capacity?: number }[],
                            };
                    const eligibleTargetsPayload =
                      audienceMode === "all_clients"
                        ? ["all"]
                        : audienceMode === "team_all"
                          ? teamsWithIds.map((t) => `team:${t.id}`)
                          : audienceMode === "team_specific"
                            ? selectedTeamIds.map((id) => `team:${id}`)
                            : eligibleTargets;
                    const eligiblePlansPayload = teamAudience ? [] : eligiblePlans;
                    const payload = {
                      name: serviceName.trim(),
                      description: serviceDescription.trim() || null,
                      type: isBookable ? serviceType : null,
                      durationMinutes:
                        Number.isFinite(duration) && duration > 0
                          ? duration
                          : fallbackDuration,
                      capacity: isBookable && slotsAvailable.trim() ? Number(slotsAvailable) : null,
                      totalSlots: isBookable && slotsAvailable.trim() ? Number(slotsAvailable) : null,
                      eligiblePlans: eligiblePlansPayload,
                      eligibleTargets: eligibleTargetsPayload,
                      ...schedulePayload,
                      isActive: active === "edit-service" ? selectedService?.isActive : true,
                      isBookable,
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
            </DialogFooter>
          </>
        ) : null}

        {active === "new-booking" ? (
          <>
            <DialogPanel className="space-y-4">
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

              <Select
                items={guardianSelectItems}
                value={bookingUserId}
                onValueChange={(value) => setBookingUserId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select guardian" />
                </SelectTrigger>
                <SelectPopup>
                  {filteredGuardians.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name ?? user.email ?? `User #${user.id}`}
                      {user.athleteName ? ` • ${user.athleteName}` : ""}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <Select
                items={serviceSelectItems}
                value={bookingServiceId}
                onValueChange={(value) => setBookingServiceId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Service type" />
                </SelectTrigger>
                <SelectPopup>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  placeholder="Date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
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

              <Select
                items={BOOKING_STATUS_ITEMS}
                value={bookingStatus}
                onValueChange={(value) => setBookingStatus(value ?? "confirmed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {BOOKING_STATUS_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
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
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </DialogPanel>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
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
                  const padStr = (value: string) => value.padStart(2, "0");
                  const startsAt = new Date(
                    `${bookingDate}T${padStr(bookingHour)}:${padStr(bookingMinute)}:00`,
                  );
                  if (Number.isNaN(startsAt.getTime())) {
                    setError("Invalid date or time.");
                    return;
                  }
                  const service = services.find(
                    (item) => String(item.id) === bookingServiceId,
                  );
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
            </DialogFooter>
          </>
        ) : null}

        {active === "calendar" ? (
          <DialogPanel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
              <div>
                <p className="text-sm font-semibold text-foreground">Next 7 days</p>
                <p className="text-xs text-muted-foreground">
                  {totalWeekBookings} booking
                  {totalWeekBookings === 1 ? "" : "s"} scheduled.
                </p>
              </div>
              <Badge variant="outline">{formatDate(new Date())}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {calendarDays.map((day) => (
                <div
                  key={getDateKey(day.date)}
                  className="rounded-2xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {formatDay(day.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                    </div>
                    <Badge variant="secondary">{day.items.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-3">
                    {day.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                        No bookings.
                      </div>
                    ) : (
                      day.items.map((booking) => {
                        const startsAt = booking.startsAt
                          ? new Date(booking.startsAt)
                          : null;
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
                              <Badge variant={statusBadgeVariant(statusKey)}>
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
          </DialogPanel>
        ) : null}

        {active === "booking-details" && selectedBooking ? (
          <>
            <DialogPanel className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-semibold text-foreground">{selectedBooking.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedBooking.athlete} • {selectedBooking.time} • {selectedBooking.type}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={statusBadgeVariant(selectedBooking.status ?? "")}>
                    {STATUS_LABELS[selectedBooking.status ?? ""] ?? selectedBooking.status ?? "unknown"}
                  </Badge>
                </div>
                <div>
                  Starts:{" "}
                  {selectedBooking.status === "pending"
                    ? "--"
                    : selectedBooking.startsAt
                      ? new Date(selectedBooking.startsAt).toLocaleString()
                      : "--"}
                </div>
                <div>
                  Ends:{" "}
                  {selectedBooking.status === "pending"
                    ? "--"
                    : selectedBooking.endTime
                      ? new Date(selectedBooking.endTime).toLocaleString()
                      : "--"}
                </div>
                <div>Location: {selectedBooking.location ?? "None"}</div>
                <div>Meeting link: {selectedBooking.meetingLink ?? "None"}</div>
              </div>
              {error ? <div className="text-sm text-destructive">{error}</div> : null}
            </DialogPanel>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
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
                        setError(
                          err instanceof Error ? err.message : "Failed to decline booking",
                        );
                      }
                    }}
                    disabled={isApproving}
                  >
                    Decline Booking
                  </Button>
                  <Button
                    onClick={() => {
                      setError(null);
                      if (!onApproveBooking) return;
                      setIsApprovePromptOpen(true);
                    }}
                    disabled={isApproving}
                  >
                    Approve Booking
                  </Button>
                </>
              ) : null}
            </DialogFooter>

            {/* Nested approve dialog */}
            <Dialog
              open={isApprovePromptOpen}
              onOpenChange={(open) => {
                if (!open) setApproveError(null);
                setIsApprovePromptOpen(open);
              }}
            >
              <DialogPopup>
                <DialogHeader>
                  <DialogTitle>Approve booking</DialogTitle>
                  <DialogDescription>
                    Set the date/time and meeting link before confirming.
                  </DialogDescription>
                </DialogHeader>
                <DialogPanel className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={approveDate}
                        onChange={(e) => setApproveDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Time</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          placeholder="Hour"
                          value={approveHour}
                          onChange={(e) => setApproveHour(e.target.value)}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          placeholder="Min"
                          value={approveMinute}
                          onChange={(e) => setApproveMinute(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Meeting link</Label>
                    <Input
                      placeholder="https://..."
                      value={approveMeetingLink}
                      onChange={(e) => setApproveMeetingLink(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g. Virtual / Studio A"
                      value={approveLocation}
                      onChange={(e) => setApproveLocation(e.target.value)}
                    />
                  </div>
                  {approveError ? (
                    <div className="text-sm text-destructive">{approveError}</div>
                  ) : null}
                </DialogPanel>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsApprovePromptOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isApproving}
                    onClick={async () => {
                      setApproveError(null);
                      if (!onApproveBooking) return;

                      if (!approveDate || approveHour === "" || approveMinute === "") {
                        setApproveError("Select a date and time.");
                        return;
                      }

                      const startsAt = new Date(
                        `${approveDate}T${String(approveHour).padStart(2, "0")}:${String(approveMinute).padStart(2, "0")}:00`,
                      );

                      if (Number.isNaN(startsAt.getTime())) {
                        setApproveError("Invalid date or time.");
                        return;
                      }

                      const service =
                        selectedBooking.serviceTypeId != null
                          ? services.find(
                              (item) => item.id === selectedBooking.serviceTypeId,
                            )
                          : undefined;

                      const duration = service?.durationMinutes ?? 0;
                      if (!duration) {
                        setApproveError("Selected booking has no service duration.");
                        return;
                      }

                      const endTime = new Date(startsAt.getTime() + duration * 60000);

                      try {
                        await onApproveBooking({
                          bookingId: selectedBooking.id,
                          startsAt: startsAt.toISOString(),
                          endTime: endTime.toISOString(),
                          meetingLink: approveMeetingLink.trim()
                            ? approveMeetingLink.trim()
                            : null,
                          location: approveLocation.trim() || null,
                        } as any);
                        setIsApprovePromptOpen(false);
                      } catch (err: unknown) {
                        setApproveError(
                          err instanceof Error ? err.message : "Failed to approve booking",
                        );
                      }
                    }}
                  >
                    Confirm approval
                  </Button>
                </DialogFooter>
              </DialogPopup>
            </Dialog>
          </>
        ) : null}
      </DialogPopup>
    </Dialog>
  );
}
