export type AdminUser = {
  id?: number;
  cognitoSub?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  profilePicture?: string | null;
  isBlocked?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  athleteId?: number | null;
  athleteName?: string | null;
  athleteAge?: number | null;
  athleteType?: string | null;
  programTier?: string | null;
  onboardingCompleted?: boolean | null;
  guardianProgramTier?: string | null;
};

export type UserOnboardingPayload = {
  guardian?: unknown;
  athlete?: unknown;
};

export type AdminBooking = {
  id: number;
  startsAt?: string | null;
  endTime?: string | null;
  type?: string | null;
  serviceType?: string | null;
  status?: "pending" | "confirmed" | "declined" | "cancelled" | string | null;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  serviceName?: string | null;
  athleteName?: string | null;
};

export type AdminBookingDetail = {
  id: number;
  startsAt?: string | null;
  endTime?: string | null;
  type?: string | null;
  status?: "pending" | "confirmed" | "declined" | "cancelled" | string | null;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  serviceTypeId?: number | null;
  serviceName?: string | null;
  serviceCapacity?: number | null;
  slotsUsed?: number | null;
  slotsTotal?: number | null;
  athleteName?: string | null;
  guardianName?: string | null;
  guardianEmail?: string | null;
  createdAt?: string | null;
};

export type AdminAvailabilityBlock = {
  id: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
  serviceName?: string | null;
};

export type AdminUserLite = {
  id?: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  athleteName?: string | null;
};

export type ServiceType = {
  id: number;
  name?: string | null;
  type?: string | null;
  description?: string | null;
  durationMinutes?: number | null;
  capacity?: number | null;
  isActive?: boolean | null;
  defaultLocation?: string | null;
  defaultMeetingLink?: string | null;
  programTier?: string | null;
  eligiblePlans?: string[] | null;
  eligibleTargets?: string[] | null;
  schedulePattern?: string | null;
  schedulePatternOptions?: any | null;
};

export type OpsSection = "bookings" | "availability" | "services" | "teams";
