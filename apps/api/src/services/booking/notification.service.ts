import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { athleteTable, bookingTable, guardianTable, notificationTable, serviceTypeTable, userTable } from "../../db/schema";
import { env } from "../../config/env";
import { sendBookingConfirmationEmail, sendBookingRequestAdminEmail } from "../../lib/mailer";
import { createBookingActionToken } from "../../lib/booking-actions";
import { ROLES_TRAINING_STAFF } from "../../lib/user-roles";
import { sendPushNotification } from "../push.service";
import { getSocketServer } from "../../socket-hub";

export async function notifyBookingRequested(input: {
  bookingId: number;
  serviceName: string;
  startsAt: Date;
  guardianId: number;
  athleteId: number;
  location?: string | null;
  meetingLink?: string | null;
}) {
  const adminWebBase = env.adminWebUrl ? env.adminWebUrl.replace(/\/$/, "") : "";
  const reviewToken = createBookingActionToken({ bookingId: input.bookingId, action: "review" });
  const reviewUrl = adminWebBase && reviewToken ? `${adminWebBase}/booking-action?token=${reviewToken}` : undefined;
  const adminUrl = adminWebBase ? `${adminWebBase}/bookings/${input.bookingId}` : undefined;

  const [guardian] = await db
    .select({ userId: guardianTable.userId })
    .from(guardianTable)
    .where(eq(guardianTable.id, input.guardianId))
    .limit(1);

  if (!guardian) return;

  const [user] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, guardian.userId))
    .limit(1);

  const [athlete] = await db
    .select({ name: athleteTable.name })
    .from(athleteTable)
    .where(eq(athleteTable.id, input.athleteId))
    .limit(1);

  const adminUsers = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(inArray(userTable.role, ROLES_TRAINING_STAFF));

  for (const admin of adminUsers) {
    if (!admin.email) continue;
    try {
      await sendBookingRequestAdminEmail({
        to: admin.email,
        bookingId: input.bookingId,
        serviceName: input.serviceName,
        startsAt: input.startsAt,
        guardianName: user?.name ?? undefined,
        guardianEmail: user?.email ?? undefined,
        athleteName: athlete?.name ?? undefined,
        location: input.location ?? undefined,
        meetingLink: input.meetingLink ?? undefined,
        reviewUrl,
        adminUrl,
      });
    } catch (error) {
      console.error("Failed to send booking request admin email", error);
    }
  }

  await db.insert(notificationTable).values({
    userId: guardian.userId,
    type: "booking_requested",
    content: `Booking requested for ${input.serviceName} at ${input.startsAt.toISOString()}`,
    link: "/schedule",
  });

  void sendPushNotification(guardian.userId, "Booking requested", `${input.serviceName} request submitted`, {
    type: "booking",
    screen: "schedule",
    url: "/schedule",
  });

  if (user?.email) {
    try {
      await sendBookingConfirmationEmail({
        to: user.email,
        name: user.name ?? "there",
        serviceName: input.serviceName,
        startsAt: input.startsAt,
        location: input.location ?? undefined,
        meetingLink: input.meetingLink ?? undefined,
      });
    } catch (error) {
      console.error("Failed to send booking confirmation email", error);
    }
  }

  const io = getSocketServer();
  if (io) {
    const payload = { message: `New booking requested: ${input.serviceName}` };
    io.to(`user:${guardian.userId}`).emit("schedule:changed", payload);
    io.to("admin:all").emit("schedule:changed", payload);
  }

  if (env.pushWebhookUrl) {
    try {
      await fetch(env.pushWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: guardian.userId,
          title: "Booking requested",
          body: `${input.serviceName} request submitted`,
          link: "/schedule",
        }),
      });
    } catch (error) {
      console.error("Failed to send push notification", error);
    }
  }
}

export async function notifyBookingCancelled(bookingId: number) {
  const [row] = await db
    .select({
      guardianId: bookingTable.guardianId,
      athleteId: bookingTable.athleteId,
      serviceTypeId: bookingTable.serviceTypeId,
    })
    .from(bookingTable)
    .where(eq(bookingTable.id, bookingId))
    .limit(1);

  if (!row) return;

  const [guardian] = await db
    .select({ userId: guardianTable.userId })
    .from(guardianTable)
    .where(eq(guardianTable.id, row.guardianId))
    .limit(1);

  const [athlete] = await db
    .select({ name: athleteTable.name })
    .from(athleteTable)
    .where(eq(athleteTable.id, row.athleteId))
    .limit(1);

  const [serviceType] = row.serviceTypeId
    ? await db
        .select({ name: serviceTypeTable.name })
        .from(serviceTypeTable)
        .where(eq(serviceTypeTable.id, row.serviceTypeId))
        .limit(1)
    : [];

  const serviceName = serviceType?.name ?? "Session";
  const athleteName = athlete?.name ?? "Athlete";

  const adminUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(inArray(userTable.role, ROLES_TRAINING_STAFF));

  for (const admin of adminUsers) {
    void sendPushNotification(
      admin.id,
      "Booking cancelled",
      `${athleteName} cancelled their ${serviceName} request`,
      { type: "booking", screen: "schedule", url: "/schedule" },
    );
  }

  const io = getSocketServer();
  if (io) {
    io.to("admin:all").emit("schedule:changed", {
      message: `Booking cancelled: ${serviceName} by ${athleteName}`,
    });
    if (guardian) {
      io.to(`user:${guardian.userId}`).emit("schedule:changed", {
        message: "Booking cancelled",
      });
    }
  }
}
