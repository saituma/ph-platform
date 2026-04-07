import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  adminSettingsTable,
  athleteTable,
  bookingTable,
  contentTable,
  messageTable,
  physioRefferalsTable,
  programTable,
  userTable,
  videoUploadTable,
  serviceTypeTable,
  availabilityBlockTable,
  ProgramType,
  exerciseTable,
  programSectionContentTable,
} from "../../db/schema";

async function getOrCreateAdminSettings(userId: number) {
  const existing = await db
    .select()
    .from(adminSettingsTable)
    .where(eq(adminSettingsTable.userId, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  const created = await db
    .insert(adminSettingsTable)
    .values({ userId })
    .returning();

  return created[0];
}

export async function getAdminProfile(userId: number) {
  const users = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  const user = users[0];
  if (!user) return null;
  const settings = await getOrCreateAdminSettings(userId);
  return { user, settings };
}

export async function updateAdminProfile(
  userId: number,
  input: {
    name: string;
    email: string;
    profilePicture?: string | null;
    title?: string | null;
    bio?: string | null;
  }
) {
  await db
    .update(userTable)
    .set({
      name: input.name,
      email: input.email,
      profilePicture: input.profilePicture ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  const existing = await getOrCreateAdminSettings(userId);

  await db
    .update(adminSettingsTable)
    .set({
      title: input.title ?? existing.title ?? null,
      bio: input.bio ?? existing.bio ?? null,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id));

  return getAdminProfile(userId);
}

export async function updateAdminPreferences(
  userId: number,
  input: {
    timezone: string;
    notificationSummary: string;
    workStartHour: number;
    workStartMinute: number;
    workEndHour: number;
    workEndMinute: number;
  }
) {
  const existing = await getOrCreateAdminSettings(userId);

  await db
    .update(adminSettingsTable)
    .set({
      timezone: input.timezone,
      notificationSummary: input.notificationSummary,
      workStartHour: input.workStartHour,
      workStartMinute: input.workStartMinute,
      workEndHour: input.workEndHour,
      workEndMinute: input.workEndMinute,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id));

  return getAdminProfile(userId);
}

export async function updateAdminMessagingAccess(
  coachUserId: number,
  tiers: (typeof ProgramType.enumValues)[number][]
) {
  const allowed = new Set(ProgramType.enumValues);
  const cleaned = tiers.filter((t) => allowed.has(t));
  const existing = await getOrCreateAdminSettings(coachUserId);
  await db
    .update(adminSettingsTable)
    .set({
      messagingEnabledTiers: cleaned,
      updatedAt: new Date(),
    })
    .where(eq(adminSettingsTable.id, existing.id));
  return cleaned;
}

export async function getDashboardMetrics(coachId: number) {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);

  const startWeek = new Date(now);
  startWeek.setDate(startWeek.getDate() - 6);
  startWeek.setHours(0, 0, 0, 0);

  const startMonth = new Date(now);
  startMonth.setDate(startMonth.getDate() - 29);
  startMonth.setHours(0, 0, 0, 0);

  const [athleteCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(athleteTable);
  const totalAthletes = Number(athleteCountRow?.count ?? 0);

  const [premiumCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(athleteTable)
    .where(eq(athleteTable.currentProgramTier, "PHP_Premium"));
  const premiumClients = Number(premiumCountRow?.count ?? 0);

  const [unreadCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messageTable)
    .where(and(eq(messageTable.receiverId, coachId), eq(messageTable.read, false)));
  const unreadMessages = Number(unreadCountRow?.count ?? 0);

  const [bookingsTodayRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookingTable)
    .where(and(gte(bookingTable.startsAt, startToday), lte(bookingTable.startsAt, endToday)));
  const bookingsToday = Number(bookingsTodayRow?.count ?? 0);

  const bookingsTodayList = await db
    .select({
      id: bookingTable.id,
      startsAt: bookingTable.startsAt,
      type: bookingTable.type,
      serviceName: serviceTypeTable.name,
      athleteName: athleteTable.name,
    })
    .from(bookingTable)
    .leftJoin(serviceTypeTable, eq(bookingTable.serviceTypeId, serviceTypeTable.id))
    .leftJoin(athleteTable, eq(bookingTable.athleteId, athleteTable.id))
    .where(and(gte(bookingTable.startsAt, startToday), lte(bookingTable.startsAt, endToday)))
    .orderBy(bookingTable.startsAt);

  const unreadMessagesList = await db
    .select({
      id: messageTable.id,
      createdAt: messageTable.createdAt,
      senderName: userTable.name,
      content: messageTable.content,
    })
    .from(messageTable)
    .leftJoin(userTable, eq(messageTable.senderId, userTable.id))
    .where(and(eq(messageTable.receiverId, coachId), eq(messageTable.read, false)))
    .orderBy(desc(messageTable.createdAt))
    .limit(2);

  const pendingOnboardings = await db
    .select({
      id: athleteTable.id,
      name: athleteTable.name,
      createdAt: athleteTable.createdAt,
    })
    .from(athleteTable)
    .where(eq(athleteTable.onboardingCompleted, false))
    .orderBy(desc(athleteTable.createdAt))
    .limit(2);

  const pendingVideos = await db
    .select({
      id: videoUploadTable.id,
      athleteName: athleteTable.name,
      createdAt: videoUploadTable.createdAt,
      notes: videoUploadTable.notes,
    })
    .from(videoUploadTable)
    .leftJoin(athleteTable, eq(videoUploadTable.athleteId, athleteTable.id))
    .where(sql`${videoUploadTable.reviewedAt} is null`)
    .orderBy(desc(videoUploadTable.createdAt))
    .limit(2);

  const priorityQueue = [
    ...pendingVideos.map((item) => ({
      title: "Video Review",
      detail: `${item.athleteName ?? "Athlete"} • ${item.notes ?? "Feedback pending"}`,
      status: "Priority Feedback",
    })),
    ...pendingOnboardings.map((item) => ({
      title: "Onboarding Review",
      detail: `${item.name ?? "Athlete"} • Application submitted`,
      status: "Assign Program",
    })),
    ...unreadMessagesList.map((item) => ({
      title: "Priority Message",
      detail: `${item.senderName ?? "Athlete"} • ${item.content.slice(0, 32)}`,
      status: "Reply Needed",
    })),
  ].slice(0, 6);

  const topByBookings = await db
    .select({
      athleteId: bookingTable.athleteId,
      count: sql<number>`count(*)`,
    })
    .from(bookingTable)
    .where(gte(bookingTable.startsAt, startMonth))
    .groupBy(bookingTable.athleteId)
    .orderBy(desc(sql`count(*)`))
    .limit(50);

  const topAthleteIds = topByBookings.map((row) => row.athleteId);
  const topAthletesRaw = topAthleteIds.length
    ? await db.select().from(athleteTable).where(inArray(athleteTable.id, topAthleteIds))
    : await db.select().from(athleteTable).orderBy(desc(athleteTable.createdAt)).limit(50);

  const topAthletes = topAthleteIds.length
    ? topByBookings.map((row) => {
        const athlete = topAthletesRaw.find((item) => item.id === row.athleteId);
        return {
          name: athlete?.name ?? "Athlete",
          team: athlete?.team ?? null,
          tier: athlete?.currentProgramTier ?? "PHP",
          score: `${row.count} sessions last 30d`,
        };
      })
    : topAthletesRaw.map((athlete) => ({
        name: athlete.name,
        team: athlete.team ?? null,
        tier: athlete.currentProgramTier ?? "PHP",
        score: "New athlete",
      }));

  const tierRows = await db
    .select({
      tier: athleteTable.currentProgramTier,
      count: sql<number>`count(*)`,
    })
    .from(athleteTable)
    .groupBy(athleteTable.currentProgramTier);

  const tierCounts = { PHP: 0, PHP_Premium: 0, PHP_Premium_Plus: 0, PHP_Pro: 0 };
  for (const row of tierRows) {
    const key = row.tier ?? "PHP";
    tierCounts[key as keyof typeof tierCounts] += Number(row.count ?? 0);
  }

  const messagesWeek = await db
    .select({
      createdAt: messageTable.createdAt,
      senderId: messageTable.senderId,
    })
    .from(messageTable)
    .where(gte(messageTable.createdAt, startWeek));

  const bookingsWeek = await db
    .select({ startsAt: bookingTable.startsAt })
    .from(bookingTable)
    .where(gte(bookingTable.startsAt, startWeek));

  const uploadsWeek = await db
    .select({ createdAt: videoUploadTable.createdAt })
    .from(videoUploadTable)
    .where(gte(videoUploadTable.createdAt, startWeek));

  const availabilityWeek = await db
    .select({ createdAt: availabilityBlockTable.createdAt })
    .from(availabilityBlockTable)
    .where(gte(availabilityBlockTable.createdAt, startWeek));

  const contentWeek = await db
    .select({ createdAt: contentTable.createdAt })
    .from(contentTable)
    .where(gte(contentTable.createdAt, startWeek));

  const referralsWeek = await db
    .select({ createdAt: physioRefferalsTable.createdAt })
    .from(physioRefferalsTable)
    .where(gte(physioRefferalsTable.createdAt, startWeek));

  const onboardingsWeek = await db
    .select({ completedAt: athleteTable.onboardingCompletedAt })
    .from(athleteTable)
    .where(gte(athleteTable.onboardingCompletedAt, startWeek));

  const dayKeys = Array.from({ length: 7 }).map((_, idx) => {
    const day = new Date(startWeek);
    day.setDate(startWeek.getDate() + idx);
    return day.toISOString().slice(0, 10);
  });

  const bucket = (value?: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
  const sumByDay = (values: (Date | null | undefined)[]) => {
    const counts = dayKeys.reduce<Record<string, number>>((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
    for (const value of values) {
      const key = bucket(value);
      if (key && key in counts) counts[key] += 1;
    }
    return dayKeys.map((key) => counts[key]);
  };

  const messageCounts = sumByDay(messagesWeek.map((item) => item.createdAt));
  const bookingCounts = sumByDay(bookingsWeek.map((item) => item.startsAt));
  const uploadCounts = sumByDay(uploadsWeek.map((item) => item.createdAt));
  const availabilityCounts = sumByDay(availabilityWeek.map((item) => item.createdAt));

  const weeklyTotals = {
    messages: messageCounts.reduce((sum, value) => sum + value, 0),
    bookings: bookingCounts.reduce((sum, value) => sum + value, 0),
    uploads: uploadCounts.reduce((sum, value) => sum + value, 0),
  };

  const messageCoachCount = messagesWeek.filter((msg) => msg.senderId === coachId).length;
  const messagingResponseRate = weeklyTotals.messages
    ? Math.min(100, Math.round((messageCoachCount / weeklyTotals.messages) * 100))
    : 0;
  const trainingLoad = totalAthletes
    ? Math.min(100, Math.round((weeklyTotals.bookings / totalAthletes) * 100))
    : 0;
  const availabilityTotal = availabilityCounts.reduce((sum, value) => sum + value, 0);
  const bookingsUtilization = availabilityTotal
    ? Math.min(100, Math.round((weeklyTotals.bookings / availabilityTotal) * 100))
    : 0;

  const weeklyProgress = dayKeys.map((_, index) => {
    return messageCounts[index] + bookingCounts[index] + uploadCounts[index];
  });

  const labels = dayKeys.map((key) => {
    const date = new Date(key);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  const programOps = [
    {
      title: "Program Templates",
      detail: `${(await db.select({ count: sql<number>`count(*)` }).from(programTable))[0]?.count ?? 0} total templates`,
    },
    {
      title: "Premium Plan Drafts",
      detail: `${premiumClients} premium athletes assigned`,
    },
    {
      title: "Exercise Library",
      detail: `${(await db.select({ count: sql<number>`count(*)` }).from(exerciseTable))[0]?.count ?? 0} exercises in library`,
    },
  ];

  const highlights = [
    {
      label: "New Onboardings",
      value: onboardingsWeek.length,
      detail: `${pendingOnboardings.length} pending review`,
    },
    {
      label: "Videos Uploaded",
      value: uploadsWeek.length,
      detail: `${pendingVideos.length} pending feedback`,
    },
    {
      label: "Content Updates",
      value: contentWeek.length,
      detail: `${contentWeek.length} published this week`,
    },
    {
      label: "Referrals",
      value: referralsWeek.length,
      detail: `${referralsWeek.length} issued this week`,
    },
  ];

  return {
    kpis: {
      totalAthletes,
      premiumClients,
      unreadMessages,
      bookingsToday,
    },
    bookingsToday: bookingsTodayList,
    priorityQueue,
    topAthletes,
    tierDistribution: {
      program: tierCounts.PHP,
      premium: tierCounts.PHP_Premium,
      premiumPlus: tierCounts.PHP_Premium_Plus,
      pro: tierCounts.PHP_Pro,
      total: tierCounts.PHP + tierCounts.PHP_Premium + tierCounts.PHP_Premium_Plus + tierCounts.PHP_Pro,
    },
    weeklyVolume: {
      totals: weeklyTotals,
      bars: weeklyProgress,
      labels,
    },
    weeklyProgress: {
      series: weeklyProgress,
      labels,
    },
    trends: {
      trainingLoad,
      messagingResponseRate,
      bookingsUtilization,
      trainingSeries: bookingCounts,
      messagingSeries: messageCounts,
      bookingSeries: bookingCounts,
    },
    highlights,
    programOps,
    priorityMessageCount: unreadMessages,
  };
}
