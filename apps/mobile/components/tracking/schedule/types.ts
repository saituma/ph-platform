export type ScheduleEvent = {
  id: string;
  dayId: string;
  dateKey: string;
  startsAt: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  meetingLink?: string | null;
  type: "training" | "call" | "recovery";
  tag: string;
  athlete: string;
  coach: string;
  notes: string;
  status?: string;
};

export type ServiceType = {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  durationMinutes: number;
  capacity?: number | null;
  remainingCapacity?: number | null;
  totalSlots?: number | null;
  remainingTotalSlots?: number | null;
  eligiblePlans?: string[] | null;
  eligibleTargets?: string[] | null;
  isLocked?: boolean;
  lockReason?: string | null;
  oneTimeDate?: string | null;
  oneTimeTime?: string | null;
  attendeeVisibility?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  isActive?: boolean | null;
  isBookable?: boolean | null;
  /** one_time | weekly_recurring — from API */
  schedulePattern?: string | null;
  weeklyEntries?: { weekday: number; time: string }[] | null;
};

export type GeneratedAvailabilitySlot = {
  slotKey: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  remainingCapacity: number | null;
};

export type GeneratedAvailabilityOccurrence = {
  serviceTypeId: number;
  serviceName: string;
  type: string;
  dateKey: string;
  occurrenceKey: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  remainingCapacity: number | null;
  slotMode: string;
  eligiblePlans?: string[];
  slots: GeneratedAvailabilitySlot[];
};
