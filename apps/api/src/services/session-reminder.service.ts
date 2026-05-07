import { and, between, eq } from "drizzle-orm";

import { db } from "../db";
import { scheduledSessionTable, sessionAttendanceTable } from "../db/schema";
import { logger } from "../lib/logger";
import { createPushIntent } from "./outbox.service";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Send push-notification reminders for sessions starting 1–2 hours from now.
 *
 * The 1–2 hour window means each session only falls into the window once
 * (the sweep runs every 30 minutes), which prevents duplicate reminders
 * without needing an extra column or de-dupe table.
 */
export async function sendSessionReminders(): Promise<{ sent: number; sessions: number }> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60_000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60_000);

  // Sessions starting between 1h and 2h from now that haven't started yet
  const upcomingSessions = await db
    .select({
      sessionId: scheduledSessionTable.id,
      sessionName: scheduledSessionTable.name,
      startsAt: scheduledSessionTable.startsAt,
    })
    .from(scheduledSessionTable)
    .where(
      and(
        eq(scheduledSessionTable.status, "upcoming"),
        between(scheduledSessionTable.startsAt, oneHourFromNow, twoHoursFromNow),
      ),
    );

  if (upcomingSessions.length === 0) {
    logger.info("[session-reminder] No sessions in reminder window");
    return { sent: 0, sessions: 0 };
  }

  let sent = 0;

  for (const session of upcomingSessions) {
    const attendees = await db
      .select({ userId: sessionAttendanceTable.userId })
      .from(sessionAttendanceTable)
      .where(eq(sessionAttendanceTable.scheduledSessionId, session.sessionId));

    const timeStr = formatTime(session.startsAt);

    for (const attendee of attendees) {
      void createPushIntent({
        userId: attendee.userId,
        title: "Session Reminder",
        body: `${session.sessionName} starts at ${timeStr}`,
        data: { type: "schedule", screen: "schedule", url: "/schedule" },
      });
      sent++;
    }
  }

  logger.info({ sent, sessions: upcomingSessions.length }, "[session-reminder] sweep complete");

  return { sent, sessions: upcomingSessions.length };
}
