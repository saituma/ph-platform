import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { logger } from "../../lib/logger";
import {
  athleteTable,
  chatGroupMemberTable,
  chatGroupTable,
  guardianTable,
  teamTable,
  userTable,
  ProgramType,
  subscriptionPlanTable,
  athleteTrainingSessionCompletionTable,
  trainingModuleSessionTable,
  trainingModuleTable,
} from "../../db/schema";
import { getStripeClient, getSuccessUrl, getCancelUrl, createTeamCheckoutSession } from "../billing/stripe.service";
import { createTeamManagerUser } from "./user.service";
import { createTeamRosterAthlete } from "../team-roster.service";
import { sendPlanInviteEmail, sendTeamPlayerPaymentInviteEmail } from "../../lib/mailer/billing.mailer";
import { teamPlayerPaymentInviteTable } from "../../db/schema";
import { randomUUID } from "crypto";
import { approveTeamSubscriptionRequest } from "../billing/team-request.service";
import { parsePriceToCents } from "../billing/plan.service";
import { teamSubscriptionRequestTable } from "../../db/schema";

async function ensureTeamExists(input: {
  name: string;
  athleteType?: "youth" | "adult";
  emailSlug?: string;
  minAge?: number;
  maxAge?: number;
  adminId?: number;
  planId?: number;
  maxAthletes?: number;
  sponsoredPlayerCount?: number;
  sponsoredPlanId?: number;
  paymentMode?: "coach_pays_all" | "per_player_all" | "per_player_selected";
}) {
  const cleanTeamName = input.name.trim();
  if (!cleanTeamName) return null;

  const existing = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(teamTable)
    .values({
      name: cleanTeamName,
      athleteType: input.athleteType ?? "youth",
      emailSlug: input.emailSlug ?? null,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      adminId: input.adminId,
      planId: input.planId,
      maxAthletes: input.maxAthletes ?? 0,
      paymentMode: input.paymentMode ?? "coach_pays_all",
      updatedAt: new Date(),
    })
    .onConflictDoNothing({ target: teamTable.name })
    .returning({ id: teamTable.id, name: teamTable.name });
  if (created) return created;

  const fallback = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  return fallback[0] ?? null;
}

async function ensureTeamChatGroup(teamName: string, createdByUserId: number) {
  const cleanTeamName = teamName.trim();
  if (!cleanTeamName) return null;

  const existing = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(and(eq(chatGroupTable.name, cleanTeamName), eq(chatGroupTable.category, "team")))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(chatGroupTable)
    .values({
      name: cleanTeamName,
      category: "team",
      createdBy: createdByUserId,
    })
    .returning({ id: chatGroupTable.id });
  if (created) return created;

  const fallback = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(and(eq(chatGroupTable.name, cleanTeamName), eq(chatGroupTable.category, "team")))
    .limit(1);
  return fallback[0] ?? null;
}

async function addUsersToGroup(groupId: number, userIds: number[]) {
  const unique = Array.from(new Set(userIds.filter((id) => Number.isFinite(id))));
  if (!unique.length) return;
  await db
    .insert(chatGroupMemberTable)
    .values(unique.map((userId) => ({ groupId, userId })))
    .onConflictDoNothing({
      target: [chatGroupMemberTable.groupId, chatGroupMemberTable.userId],
    });
}

async function syncTeamChatMembers(teamId: number, groupId: number) {
  const teamRows = await db
    .select({ adminId: teamTable.adminId })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);

  const teamAdminId = teamRows[0]?.adminId;

  const athleteUsers = await db
    .select({
      athleteUserId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.teamId, teamId), eq(userTable.isDeleted, false)));

  const guardianIds = athleteUsers.map((row) => row.guardianId).filter((id): id is number => typeof id === "number");

  const guardianUsers = guardianIds.length
    ? await db
        .select({ userId: guardianTable.userId })
        .from(guardianTable)
        .innerJoin(userTable, eq(guardianTable.userId, userTable.id))
        .where(and(eq(userTable.isDeleted, false), inArray(guardianTable.id, guardianIds)))
    : [];

  const staffUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        inArray(userTable.role, ["coach", "program_coach", "team_coach", "admin", "superAdmin"]),
        eq(userTable.isDeleted, false),
      ),
    );

  const userIds = [
    ...athleteUsers.map((row) => row.athleteUserId),
    ...guardianUsers.map((row) => row.userId),
    ...staffUsers.map((row) => row.id),
  ];

  if (teamAdminId) userIds.push(teamAdminId);

  await addUsersToGroup(groupId, userIds);
}

export async function createTeamAdmin(input: {
  teamName: string;
  athleteType?: "youth" | "adult";
  emailSlug?: string;
  minAge?: number;
  maxAge?: number;
  adminId?: number;
  managerEmail?: string;
  managerPassword?: string;
  managerName?: string;
  tier: (typeof ProgramType.enumValues)[number];
  maxAthletes: number;
  createdByUserId: number;
  paymentMethod?: "pay_now" | "email_link" | "cash";
  billingCycle?: "monthly" | "6months" | "yearly";
  hasSponsoredPlayers?: boolean;
  sponsoredPlayerCount?: number;
  sponsoredTier?: (typeof ProgramType.enumValues)[number];
  paymentMode?: "coach_pays_all" | "per_player_all" | "per_player_selected";
  coachPaysSeats?: number;
  playerEmails?: string[];
  playerPayers?: Array<{ name: string; email: string; selected?: boolean }>;
  athleteProfiles?: Array<{ name?: string | null; birthDate?: string | null; guardianEmail?: string | null }>;
}) {
  const cleanTeamName = input.teamName.trim();
  if (!cleanTeamName) {
    throw { status: 400, message: "Team name is required." };
  }

  const existing = await db
    .select({ id: teamTable.id })
    .from(teamTable)
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  if (existing[0]) {
    throw { status: 409, message: "A team with this name already exists." };
  }

  const plans = await db
    .select()
    .from(subscriptionPlanTable)
    .where(and(eq(subscriptionPlanTable.tier, input.tier), eq(subscriptionPlanTable.isActive, true)))
    .limit(1);
  const plan = plans[0] ?? null;
  const resolvedPlanId = plan?.id ?? null;

  if (!resolvedPlanId) {
    throw {
      status: 400,
      message: `No active subscription plan found for ${input.tier}. Activate a plan in Billing before creating the team.`,
    };
  }

  const sponsoredCount = input.hasSponsoredPlayers ? Math.max(0, input.sponsoredPlayerCount ?? 0) : 0;
  let sponsoredPlanId: number | null = null;
  let sponsoredTier: (typeof ProgramType.enumValues)[number] | null = null;
  if (sponsoredCount > 0 && input.sponsoredTier) {
    const sponsoredPlans = await db
      .select()
      .from(subscriptionPlanTable)
      .where(and(eq(subscriptionPlanTable.tier, input.sponsoredTier), eq(subscriptionPlanTable.isActive, true)))
      .limit(1);
    sponsoredPlanId = sponsoredPlans[0]?.id ?? null;
    sponsoredTier = input.sponsoredTier;
  }

  // If manager credentials are provided, create the manager user first.
  let resolvedAdminId = input.adminId;
  if (input.managerEmail && input.managerPassword) {
    const manager = await createTeamManagerUser({
      email: input.managerEmail,
      password: input.managerPassword,
      name: input.managerName,
    });
    resolvedAdminId = manager.id;
  }

  if (!resolvedAdminId) {
    throw { status: 400, message: "A team manager is required. Provide managerEmail and managerPassword." };
  }

  const paymentMethod = input.paymentMethod ?? "pay_now";
  const billingCycle = input.billingCycle ?? "monthly";
  const monthlyPlanAmountCents = parsePriceToCents(plan?.monthlyPrice ?? plan?.displayPrice);
  const planAmountCents =
    billingCycle === "yearly"
      ? (parsePriceToCents(plan?.yearlyPrice) ?? monthlyPlanAmountCents)
      : billingCycle === "6months"
        ? monthlyPlanAmountCents != null
          ? monthlyPlanAmountCents * 6
          : parsePriceToCents(plan?.displayPrice)
        : monthlyPlanAmountCents;

  // Create the team record first
  const created = await ensureTeamExists({
    name: cleanTeamName,
    athleteType: input.athleteType,
    emailSlug: input.emailSlug,
    minAge: input.minAge,
    maxAge: input.maxAge,
    adminId: resolvedAdminId,
    planId: resolvedPlanId ?? undefined,
    maxAthletes: input.maxAthletes + sponsoredCount,
    paymentMode: input.paymentMode,
  });

  if (created && sponsoredCount > 0) {
    await db
      .update(teamTable)
      .set({
        sponsoredPlayerCount: sponsoredCount,
        sponsoredPlanId: sponsoredPlanId,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, created.id));
  }

  if (!created) {
    throw { status: 500, message: "Failed to create team record." };
  }

  const adminUserRows = await db
    .select({ id: userTable.id, role: userTable.role, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, resolvedAdminId!))
    .limit(1);

  let adminEmail = adminUserRows[0]?.email;

  if (adminUserRows[0]) {
    // Preserve higher-level roles; promote everyone else (including generic "coach") to team_coach.
    const preserveRole = ["team_coach", "program_coach", "admin", "superAdmin"].includes(adminUserRows[0].role || "");
    if (!preserveRole) {
      await db.update(userTable).set({ role: "team_coach" }).where(eq(userTable.id, resolvedAdminId!));
    }
  }

  let checkoutUrl: string | null = null;
  const intervalKey = billingCycle === "monthly" ? "monthly" : billingCycle === "6months" ? "six_months" : "yearly";
  const lookupKey = `${input.tier.toLowerCase()}_${intervalKey}`;

  if (paymentMethod === "cash") {
    // 1. CASH FLOW: Activate immediately
    const expiresAt = new Date();
    if (billingCycle === "6months") expiresAt.setMonth(expiresAt.getMonth() + 6);
    else if (billingCycle === "yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db
      .update(teamTable)
      .set({
        subscriptionStatus: "active",
        planPaymentType: billingCycle === "monthly" ? "monthly" : "upfront",
        planCommitmentMonths: billingCycle === "6months" ? 6 : billingCycle === "yearly" ? 12 : 1,
        planExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(teamTable.id, created.id));
  } else {
    // 2. STRIPE FLOW (Pay Now or Email Link)

    try {
      const sponsoredLineItem =
        sponsoredCount > 0 && sponsoredTier
          ? {
              priceLookupKey: `${sponsoredTier.toLowerCase()}_${intervalKey}`,
              tier: sponsoredTier,
              quantity: sponsoredCount,
            }
          : undefined;

      const session = await createTeamCheckoutSession({
        teamId: created.id,
        adminId: resolvedAdminId!,
        priceLookupKey: lookupKey,
        tier: input.tier,
        interval: billingCycle === "monthly" ? "monthly" : billingCycle === "6months" ? "six_months" : "yearly",
        quantity: input.maxAthletes,
        mode: billingCycle === "monthly" ? "subscription" : "payment",
        customerEmail: paymentMethod === "email_link" ? adminEmail : undefined,
        sponsoredLineItem,
      });

      checkoutUrl = session.url;

      if (paymentMethod === "email_link" && checkoutUrl && adminEmail) {
        const managerName = adminUserRows[0] ? input.managerName || adminEmail.split("@")[0] : adminEmail.split("@")[0];
        await sendPlanInviteEmail({
          to: adminEmail,
          name: managerName,
          planName: cleanTeamName,
          planTier: input.tier,
          checkoutUrl,
          invitedByName: null,
          loginCredentials:
            input.managerEmail && input.managerPassword
              ? { email: input.managerEmail, temporaryPassword: input.managerPassword }
              : null,
        });
      }
    } catch (err: any) {
      logger.error({ err }, "[Stripe] Failed to create team checkout session");
    }
  }

  const group = await ensureTeamChatGroup(cleanTeamName, input.createdByUserId);
  if (group?.id) {
    await syncTeamChatMembers(created.id, group.id);
  }

  // Provision athlete accounts from profiles and build a credentials map keyed by payer email
  // so the payment invite email can include login details for the athlete.
  const athleteCredentialsByEmail = new Map<string, { email: string; temporaryPassword: string }>();
  const profiles = (input.athleteProfiles ?? []).filter((p) => p.name?.trim());
  for (const profile of profiles) {
    try {
      const username = profile.name!.trim();
      const age = (() => {
        if (!profile.birthDate) return 10;
        const dob = new Date(profile.birthDate);
        if (isNaN(dob.getTime())) return 10;
        const today = new Date();
        let a = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
        return Math.max(5, Math.min(99, a));
      })();
      const provisioned = await createTeamRosterAthlete(
        { id: input.createdByUserId, role: "admin" },
        { teamId: created.id, username, name: username, age, birthDate: profile.birthDate ?? undefined },
      );
      const creds = { email: provisioned.email, temporaryPassword: provisioned.temporaryPassword };
      athleteCredentialsByEmail.set(provisioned.email.toLowerCase(), creds);
      if (profile.guardianEmail?.trim()) {
        athleteCredentialsByEmail.set(profile.guardianEmail.trim().toLowerCase(), creds);
      }
    } catch (err) {
      logger.warn({ err, profile }, "[createTeam] Failed to provision athlete from profile");
    }
  }

  // Handle player payment invites if needed
  let invitesSent = 0;
  if (
    input.paymentMode &&
    input.paymentMode !== "coach_pays_all" &&
    ((input.playerPayers && input.playerPayers.length > 0) || (input.playerEmails && input.playerEmails.length > 0)) &&
    resolvedPlanId
  ) {
    const normalizedRows = (input.playerPayers ?? []).map((row) => ({
      name: row.name.trim(),
      email: row.email.trim().toLowerCase(),
      selected: row.selected === true,
    }));

    const payersFromRows = normalizedRows.filter((row) => row.name && row.email);

    const fallbackEmails = (input.playerEmails ?? [])
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .map((email) => ({ name: email.split("@")[0] ?? "Player", email, selected: true }));

    const payerRows = (payersFromRows.length ? payersFromRows : fallbackEmails).filter((row) =>
      input.paymentMode === "per_player_selected" ? row.selected : true,
    );

    if (!payerRows.length) {
      throw {
        status: 400,
        message:
          input.paymentMode === "per_player_selected"
            ? "Select at least one player payer."
            : "Add at least one player payer.",
      };
    }

    // 1. Create a team subscription request to act as the parent for these invites
    const [reqRow] = await db
      .insert(teamSubscriptionRequestTable)
      .values({
        adminId: resolvedAdminId!,
        teamId: created.id,
        planId: resolvedPlanId,
        planBillingCycle: billingCycle,
        paymentAmountCents:
          input.paymentMode === "per_player_selected" && planAmountCents != null
            ? Math.max(0, input.coachPaysSeats ?? 0) * planAmountCents
            : null,
        paymentCurrency: "gbp",
        paymentMode: input.paymentMode,
        coachPaysSeats: input.coachPaysSeats ?? 0,
        receiptPublicId: randomUUID(),
        status: "pending_approval",
      })
      .returning({ id: teamSubscriptionRequestTable.id });

    // 2. Create the invite rows
    const inviteValues = payerRows.map((row) => ({
      requestId: reqRow.id,
      teamId: created.id,
      playerEmail: row.email,
      playerName: row.name,
      amountCents: planAmountCents,
      currency: "gbp",
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const insertedInvites = await db
      .insert(teamPlayerPaymentInviteTable)
      .values(inviteValues)
      .onConflictDoNothing()
      .returning();

    invitesSent = insertedInvites.length;

    // 3. Create Stripe checkout sessions and send invite emails
    let emailsSent = 0;
    let inviteEmailsError: string | null = null;
    try {
      const stripeClient = getStripeClient();
      // Resolve the price ID for per-player invites
      let priceId: string | undefined;
      try {
        const prices = await stripeClient.prices.list({ lookup_keys: [lookupKey], active: true });
        if (prices.data[0]) priceId = prices.data[0].id;
      } catch {}

      if (priceId) {
        const priceObj = await stripeClient.prices.retrieve(priceId);
        const seatAmountCents = priceObj.unit_amount ?? planAmountCents ?? 0;

        for (const invite of insertedInvites) {
          try {
            const now = new Date();
            const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5));
            if (anchor <= now) anchor.setUTCMonth(anchor.getUTCMonth() + 1);
            const billingAnchor = Math.floor(anchor.getTime() / 1000);

            const playerSession = await stripeClient.checkout.sessions.create({
              mode: billingCycle === "monthly" ? "subscription" : "payment",
              customer_email: invite.playerEmail,
              ...(billingCycle !== "monthly" ? { customer_creation: "always" } : {}),
              payment_method_types: ["card"],
              line_items: [{ price: priceId, quantity: 1 }],
              ...(billingCycle !== "monthly"
                ? { payment_intent_data: { receipt_email: invite.playerEmail } }
                : {
                    subscription_data: {
                      billing_cycle_anchor: billingAnchor,
                      proration_behavior: "create_prorations",
                    },
                  }),
              metadata: {
                type: "team_player_invite",
                inviteId: String(invite.id),
                requestId: String(reqRow.id),
                teamId: String(created.id),
              },
              success_url: `${getSuccessUrl()}?session_id={CHECKOUT_SESSION_ID}&player_paid=true`,
              cancel_url: getCancelUrl(),
            });

            await db
              .update(teamPlayerPaymentInviteTable)
              .set({ stripeSessionId: playerSession.id, stripePaymentLinkUrl: playerSession.url, amountCents: seatAmountCents, updatedAt: new Date() })
              .where(eq(teamPlayerPaymentInviteTable.id, invite.id));

            if (playerSession.url) {
              const emailResult = await sendTeamPlayerPaymentInviteEmail({
                to: invite.playerEmail,
                payerName: invite.playerName,
                teamName: created.name,
                planName: String(plan?.name ?? plan?.tier ?? "PH Performance plan"),
                checkoutUrl: playerSession.url,
                loginCredentials: athleteCredentialsByEmail.get(invite.playerEmail.toLowerCase()) ?? null,
              });
              if (emailResult.ok) {
                emailsSent += 1;
                await db
                  .update(teamPlayerPaymentInviteTable)
                  .set({ emailSentAt: new Date(), emailLastError: null, updatedAt: new Date() })
                  .where(eq(teamPlayerPaymentInviteTable.id, invite.id));
              } else {
                inviteEmailsError = emailResult.error;
                await db
                  .update(teamPlayerPaymentInviteTable)
                  .set({ emailLastError: emailResult.error, updatedAt: new Date() })
                  .where(eq(teamPlayerPaymentInviteTable.id, invite.id));
              }
            }
          } catch (inviteErr) {
            logger.error({ err: inviteErr, inviteId: invite.id }, "[createTeam] Failed to send player invite");
            inviteEmailsError = inviteErr instanceof Error ? inviteErr.message : "Failed to send player invite";
          }
        }
      }
    } catch (stripeErr) {
      logger.error({ err: stripeErr }, "[createTeam] Failed to set up player invite Stripe sessions");
      inviteEmailsError = stripeErr instanceof Error ? stripeErr.message : "Stripe setup failed";
    }

    const allEmailsSent = invitesSent > 0 && emailsSent === invitesSent;
    await db
      .update(teamSubscriptionRequestTable)
      .set({
        inviteEmailsReady: allEmailsSent,
        inviteEmailsLastAttemptAt: new Date(),
        inviteEmailsError,
        updatedAt: new Date(),
      })
      .where(eq(teamSubscriptionRequestTable.id, reqRow.id));
  }

  return {
    ok: true,
    team: created.name,
    teamId: created.id,
    checkoutUrl: paymentMethod === "pay_now" && input.paymentMode === "coach_pays_all" ? checkoutUrl : null,
    sentToEmail: paymentMethod === "email_link" || (input.paymentMode && input.paymentMode !== "coach_pays_all"),
    invitesSent,
  };
}

export async function approveTeamAdmin(
  teamId: number,
  billingCycle: "monthly" | "6months" | "yearly" = "monthly",
  accessTierOverride?: (typeof ProgramType.enumValues)[number] | null,
) {
  const rows = await db
    .select({ id: teamTable.id, name: teamTable.name, subscriptionStatus: teamTable.subscriptionStatus, planId: teamTable.planId })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);
  const team = rows[0];
  if (!team) throw { status: 404, message: "Team not found." };

  const expiresAt = new Date();
  if (billingCycle === "6months") expiresAt.setMonth(expiresAt.getMonth() + 6);
  else if (billingCycle === "yearly") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db
    .update(teamTable)
    .set({
      subscriptionStatus: "active",
      planPaymentType: billingCycle === "monthly" ? "monthly" : "upfront",
      planCommitmentMonths: billingCycle === "6months" ? 6 : billingCycle === "yearly" ? 12 : 1,
      planExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(teamTable.id, teamId));

  // Determine effective tier: override > plan tier > PHP_Pro
  let effectiveTier: (typeof ProgramType.enumValues)[number] | null = accessTierOverride ?? null;
  if (!effectiveTier && team.planId) {
    const [plan] = await db
      .select({ tier: subscriptionPlanTable.tier })
      .from(subscriptionPlanTable)
      .where(eq(subscriptionPlanTable.id, team.planId))
      .limit(1);
    effectiveTier = plan?.tier ?? "PHP_Pro";
  }
  if (!effectiveTier) effectiveTier = "PHP_Pro";

  // Grant tier to all athletes on this team who don't already have one
  const athletes = await db
    .select({ id: athleteTable.id, guardianId: athleteTable.guardianId })
    .from(athleteTable)
    .where(and(eq(athleteTable.teamId, teamId), isNull(athleteTable.currentProgramTier)));

  if (athletes.length > 0) {
    await db
      .update(athleteTable)
      .set({ currentProgramTier: effectiveTier, planExpiresAt: expiresAt, updatedAt: new Date() })
      .where(and(eq(athleteTable.teamId, teamId), isNull(athleteTable.currentProgramTier)));

    const guardianIds = athletes.map((a) => a.guardianId).filter((id): id is number => id != null);
    if (guardianIds.length > 0) {
      await db
        .update(guardianTable)
        .set({ currentProgramTier: effectiveTier, updatedAt: new Date() })
        .where(inArray(guardianTable.id, guardianIds));
    }
  }

  return { ok: true, teamId, status: "active" };
}

export async function approveTeamSponsorRestAdmin(
  teamId: number,
  billingCycle: "monthly" | "6months" | "yearly" = "monthly",
  accessTierOverride?: (typeof ProgramType.enumValues)[number] | null,
) {
  const [latestRequest] = await db
    .select({ id: teamSubscriptionRequestTable.id })
    .from(teamSubscriptionRequestTable)
    .where(eq(teamSubscriptionRequestTable.teamId, teamId))
    .orderBy(desc(teamSubscriptionRequestTable.createdAt))
    .limit(1);

  if (!latestRequest) {
    return approveTeamAdmin(teamId, billingCycle, accessTierOverride);
  }

  // Persist the override so approveTeamSubscriptionRequest picks it up
  if (accessTierOverride) {
    await db
      .update(teamSubscriptionRequestTable)
      .set({ accessTierOverride, updatedAt: new Date() })
      .where(eq(teamSubscriptionRequestTable.id, latestRequest.id));
  }

  await db
    .update(teamPlayerPaymentInviteTable)
    .set({
      status: "paid",
      paidAt: new Date(),
      emailLastError: "sponsored_by_manager",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teamPlayerPaymentInviteTable.requestId, latestRequest.id),
        inArray(teamPlayerPaymentInviteTable.status, ["pending", "expired", "cancelled"]),
      ),
    );

  const approved = await approveTeamSubscriptionRequest(latestRequest.id);
  if (!approved) {
    throw { status: 404, message: "Team payment request not found." };
  }

  return { ok: true, teamId, status: "active", sponsoredRemaining: true };
}

export async function listTeamsAdmin(options?: { adminId?: number | null; limit?: number }) {
  const filters: any[] = [];
  if (typeof options?.adminId === "number") {
    filters.push(eq(teamTable.adminId, options.adminId));
  }

  const effectiveLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.min(200, Math.floor(options.limit)))
      : 200;

  const baseQuery = () =>
    db
      .select({
        id: teamTable.id,
        team: teamTable.name,
        athleteType: teamTable.athleteType,
        minAge: teamTable.minAge,
        maxAge: teamTable.maxAge,
        adminId: teamTable.adminId,
        planId: teamTable.planId,
        maxAthletes: teamTable.maxAthletes,
        paymentMode: teamTable.paymentMode,
        subscriptionStatus: teamTable.subscriptionStatus,
        planPaymentType: teamTable.planPaymentType,
        planCommitmentMonths: teamTable.planCommitmentMonths,
        planExpiresAt: teamTable.planExpiresAt,
        memberCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`,
        youthCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'youth'), 0)`,
        adultCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'adult'), 0)`,
        guardianCount: sql<number>`coalesce(count(distinct ${athleteTable.guardianId}) filter (where ${userTable.isDeleted} = false), 0)`,
        createdAt: teamTable.createdAt,
        updatedAt: teamTable.updatedAt,
      })
      .from(teamTable)
      .leftJoin(athleteTable, eq(athleteTable.teamId, teamTable.id))
      .leftJoin(userTable, eq(athleteTable.userId, userTable.id))
      .where(filters.length ? and(...filters) : undefined)
      .groupBy(
        teamTable.id,
        teamTable.name,
        teamTable.paymentMode,
        teamTable.subscriptionStatus,
        teamTable.planPaymentType,
        teamTable.planCommitmentMonths,
        teamTable.planExpiresAt,
        teamTable.createdAt,
        teamTable.updatedAt,
      )
      .orderBy(
        desc(sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`),
        teamTable.name,
      )
      .limit(effectiveLimit);

  try {
    const teams = await baseQuery();
    const withQueue = await Promise.all(
      teams.map(async (team) => {
        const [request] = await db
          .select({
            id: teamSubscriptionRequestTable.id,
            status: teamSubscriptionRequestTable.status,
            paymentMode: teamSubscriptionRequestTable.paymentMode,
            paymentStatus: teamSubscriptionRequestTable.paymentStatus,
            allPaymentsComplete: teamSubscriptionRequestTable.allPaymentsComplete,
          })
          .from(teamSubscriptionRequestTable)
          .where(eq(teamSubscriptionRequestTable.teamId, team.id))
          .orderBy(desc(teamSubscriptionRequestTable.createdAt))
          .limit(1);

        if (!request) return { ...team, paymentQueue: null };

        const invites = await db
          .select({
            status: teamPlayerPaymentInviteTable.status,
            emailLastError: teamPlayerPaymentInviteTable.emailLastError,
          })
          .from(teamPlayerPaymentInviteTable)
          .where(eq(teamPlayerPaymentInviteTable.requestId, request.id));

        const paidCount = invites.filter((i) => i.status === "paid").length;
        const sponsoredCount = invites.filter(
          (i) => i.status === "paid" && i.emailLastError === "sponsored_by_manager",
        ).length;

        return {
          ...team,
          paymentQueue: {
            requestId: request.id,
            status: request.status,
            paymentMode: request.paymentMode,
            allPaymentsComplete: request.allPaymentsComplete,
            paidCount,
            totalCount: invites.length,
            sponsoredCount,
          },
        };
      }),
    );

    return withQueue;
  } catch (err: any) {
    const code = err?.cause?.code ?? err?.code;
    const msg = `${err?.cause?.message ?? ""} ${err?.message ?? ""}`.toLowerCase();
    if (!(code === "42703" && msg.includes("payment_mode"))) throw err;

    logger.warn({ err }, "[admin.team] teams.payment_mode missing; using legacy team list query");
    const rows = await db
      .select({
        id: teamTable.id,
        team: teamTable.name,
        athleteType: teamTable.athleteType,
        minAge: teamTable.minAge,
        maxAge: teamTable.maxAge,
        adminId: teamTable.adminId,
        planId: teamTable.planId,
        maxAthletes: teamTable.maxAthletes,
        paymentMode: sql<string>`'coach_pays_all'`,
        subscriptionStatus: teamTable.subscriptionStatus,
        planPaymentType: teamTable.planPaymentType,
        planCommitmentMonths: teamTable.planCommitmentMonths,
        planExpiresAt: teamTable.planExpiresAt,
        memberCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`,
        youthCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'youth'), 0)`,
        adultCount: sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false and ${athleteTable.athleteType}::text = 'adult'), 0)`,
        guardianCount: sql<number>`coalesce(count(distinct ${athleteTable.guardianId}) filter (where ${userTable.isDeleted} = false), 0)`,
        createdAt: teamTable.createdAt,
        updatedAt: teamTable.updatedAt,
      })
      .from(teamTable)
      .leftJoin(athleteTable, eq(athleteTable.teamId, teamTable.id))
      .leftJoin(userTable, eq(athleteTable.userId, userTable.id))
      .where(filters.length ? and(...filters) : undefined)
      .groupBy(
        teamTable.id,
        teamTable.name,
        teamTable.subscriptionStatus,
        teamTable.planPaymentType,
        teamTable.planCommitmentMonths,
        teamTable.planExpiresAt,
        teamTable.createdAt,
        teamTable.updatedAt,
      )
      .orderBy(
        desc(sql<number>`coalesce(count(${athleteTable.id}) filter (where ${userTable.isDeleted} = false), 0)`),
        teamTable.name,
      )
      .limit(effectiveLimit);
    return rows.map((row) => ({ ...row, paymentQueue: null }));
  }
}

function normalizeInjuriesForText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const flattened = value.map((item) => (typeof item === "string" ? item.trim() : String(item))).filter(Boolean);
    return flattened.length ? flattened.join(", ") : null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function getTeamDetailsAdmin(teamName: string) {
  const cleanTeamName = teamName.trim();
  if (!cleanTeamName) return null;

  const teamRows = await db
    .select({
      id: teamTable.id,
      name: teamTable.name,
      athleteType: teamTable.athleteType,
      minAge: teamTable.minAge,
      maxAge: teamTable.maxAge,
      adminId: teamTable.adminId,
      planId: teamTable.planId,
      planTier: subscriptionPlanTable.tier,
      planName: subscriptionPlanTable.name,
      planDisplayPrice: subscriptionPlanTable.displayPrice,
      planBillingInterval: subscriptionPlanTable.billingInterval,
      planMonthlyPrice: subscriptionPlanTable.monthlyPrice,
      planYearlyPrice: subscriptionPlanTable.yearlyPrice,
      sponsoredPlayerCount: teamTable.sponsoredPlayerCount,
      sponsoredPlanId: teamTable.sponsoredPlanId,
      subscriptionStatus: teamTable.subscriptionStatus,
      createdAt: teamTable.createdAt,
      updatedAt: teamTable.updatedAt,
    })
    .from(teamTable)
    .leftJoin(subscriptionPlanTable, eq(teamTable.planId, subscriptionPlanTable.id))
    .where(eq(teamTable.name, cleanTeamName))
    .limit(1);
  const team = teamRows[0];
  if (!team) return null;

  let manager: { id: number; name: string | null; email: string; role: string | null } | null = null;
  if (team.adminId) {
    const [row] = await db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email, role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, team.adminId))
      .limit(1);
    if (row) manager = row;
  }

  const sessionsCompletedExpr = sql<number>`(SELECT count(*) FROM ${athleteTrainingSessionCompletionTable} WHERE ${athleteTrainingSessionCompletionTable.athleteId} = ${athleteTable.id})`;
  const modulesCompletedExpr = sql<number>`(
    SELECT count(DISTINCT m.id)
    FROM ${trainingModuleTable} m
    WHERE NOT EXISTS (
      SELECT 1 FROM ${trainingModuleSessionTable} s
      WHERE s."moduleId" = m.id
      AND NOT EXISTS (
        SELECT 1 FROM ${athleteTrainingSessionCompletionTable} c
        WHERE c."athleteId" = ${athleteTable.id}
        AND c."sessionId" = s.id
      )
    )
    AND EXISTS (SELECT 1 FROM ${trainingModuleSessionTable} s2 WHERE s2."moduleId" = m.id)
  )`;

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      athleteName: athleteTable.name,
      birthDate: athleteTable.birthDate,
      trainingPerWeek: athleteTable.trainingPerWeek,
      currentProgramTier: athleteTable.currentProgramTier,
      isSponsored: athleteTable.isSponsored,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      guardianId: guardianTable.id,
      guardianEmail: guardianTable.email,
      guardianPhone: guardianTable.phoneNumber,
      relationToAthlete: guardianTable.relationToAthlete,
      sessionsCompleted: sessionsCompletedExpr,
      modulesCompleted: modulesCompletedExpr,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(and(eq(athleteTable.teamId, team.id), eq(userTable.isDeleted, false)))
    .orderBy(desc(sessionsCompletedExpr), asc(athleteTable.name));

  const memberCount = rows.length;
  const guardianCount = new Set(rows.map((row) => row.guardianId).filter((id) => id != null)).size;

  const defaults = rows.reduce(
    (acc, row) => ({
      injuries: acc.injuries ?? (row.injuries ? JSON.stringify(row.injuries) : null),
      growthNotes: acc.growthNotes ?? row.growthNotes ?? null,
      performanceGoals: acc.performanceGoals ?? row.performanceGoals ?? null,
      equipmentAccess: acc.equipmentAccess ?? row.equipmentAccess ?? null,
    }),
    {
      injuries: null as string | null,
      growthNotes: null as string | null,
      performanceGoals: null as string | null,
      equipmentAccess: null as string | null,
    },
  );

  function calcAge(birthDate: string | null): number | null {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  return {
    team: team.name,
    teamId: team.id,
    athleteType: team.athleteType ?? "youth",
    minAge: team.minAge,
    maxAge: team.maxAge,
    planTier: team.planTier ?? null,
    planName: team.planName ?? null,
    planDisplayPrice: team.planDisplayPrice ?? null,
    planBillingInterval: team.planBillingInterval ?? null,
    planMonthlyPrice: team.planMonthlyPrice ?? null,
    planYearlyPrice: team.planYearlyPrice ?? null,
    planMonthlyAmountCents: parsePriceToCents(team.planMonthlyPrice ?? team.planDisplayPrice),
    sponsoredPlayerCount: team.sponsoredPlayerCount,
    sponsoredPlanId: team.sponsoredPlanId,
    subscriptionStatus: team.subscriptionStatus ?? "pending_payment",
    manager,
    paymentQueue: await (async () => {
      const [request] = await db
        .select({
          id: teamSubscriptionRequestTable.id,
          status: teamSubscriptionRequestTable.status,
          paymentMode: teamSubscriptionRequestTable.paymentMode,
          paymentStatus: teamSubscriptionRequestTable.paymentStatus,
          planBillingCycle: teamSubscriptionRequestTable.planBillingCycle,
          paymentAmountCents: teamSubscriptionRequestTable.paymentAmountCents,
          paymentCurrency: teamSubscriptionRequestTable.paymentCurrency,
          allPaymentsComplete: teamSubscriptionRequestTable.allPaymentsComplete,
          coachPaysSeats: teamSubscriptionRequestTable.coachPaysSeats,
          inviteEmailsReady: teamSubscriptionRequestTable.inviteEmailsReady,
          inviteEmailsLastAttemptAt: teamSubscriptionRequestTable.inviteEmailsLastAttemptAt,
          inviteEmailsError: teamSubscriptionRequestTable.inviteEmailsError,
        })
        .from(teamSubscriptionRequestTable)
        .where(eq(teamSubscriptionRequestTable.teamId, team.id))
        .orderBy(desc(teamSubscriptionRequestTable.createdAt))
        .limit(1);
      if (!request) return null;

      const invites = await db
        .select({
          id: teamPlayerPaymentInviteTable.id,
          playerName: teamPlayerPaymentInviteTable.playerName,
          playerEmail: teamPlayerPaymentInviteTable.playerEmail,
          amountCents: teamPlayerPaymentInviteTable.amountCents,
          currency: teamPlayerPaymentInviteTable.currency,
          status: teamPlayerPaymentInviteTable.status,
          paidAt: teamPlayerPaymentInviteTable.paidAt,
          emailSentAt: teamPlayerPaymentInviteTable.emailSentAt,
          emailLastError: teamPlayerPaymentInviteTable.emailLastError,
        })
        .from(teamPlayerPaymentInviteTable)
        .where(eq(teamPlayerPaymentInviteTable.requestId, request.id))
        .orderBy(asc(teamPlayerPaymentInviteTable.createdAt));

      const defaultPlanAmountCents =
        request.planBillingCycle === "yearly"
          ? (parsePriceToCents(team.planYearlyPrice) ??
            parsePriceToCents(team.planMonthlyPrice ?? team.planDisplayPrice))
          : request.planBillingCycle === "6months"
            ? (() => {
                const monthly = parsePriceToCents(team.planMonthlyPrice ?? team.planDisplayPrice);
                return monthly != null ? monthly * 6 : parsePriceToCents(team.planDisplayPrice);
              })()
            : parsePriceToCents(team.planMonthlyPrice ?? team.planDisplayPrice);
      const effectiveInvites = invites.map((invite) => ({
        ...invite,
        amountCents: invite.amountCents ?? defaultPlanAmountCents,
      }));
      const managerAmountCents =
        request.paymentAmountCents ??
        (defaultPlanAmountCents != null ? Math.max(0, request.coachPaysSeats ?? 0) * defaultPlanAmountCents : 0);
      const managerPaidAmountCents = request.paymentStatus === "paid" ? managerAmountCents : 0;
      const managerRemainingAmountCents = request.paymentStatus === "paid" ? 0 : managerAmountCents;
      const paidPlayerAmountCents = effectiveInvites
        .filter((i) => i.status === "paid")
        .reduce((sum, i) => sum + (i.amountCents ?? 0), 0);
      const remainingPlayerAmountCents = effectiveInvites
        .filter((i) => i.status !== "paid")
        .reduce((sum, i) => sum + (i.amountCents ?? 0), 0);
      const playerAmountCents = effectiveInvites.reduce((sum, i) => sum + (i.amountCents ?? 0), 0);
      const totalAmountCents = managerAmountCents + playerAmountCents;
      const paidAmountCents = managerPaidAmountCents + paidPlayerAmountCents;
      const remainingAmountCents = managerRemainingAmountCents + remainingPlayerAmountCents;

      return {
        requestId: request.id,
        status: request.status,
        paymentMode: request.paymentMode,
        paymentStatus: request.paymentStatus,
        paymentAmountCents: request.paymentAmountCents,
        paymentCurrency: request.paymentCurrency,
        allPaymentsComplete: request.allPaymentsComplete,
        coachPaysSeats: request.coachPaysSeats,
        inviteEmailsReady: request.inviteEmailsReady,
        inviteEmailsLastAttemptAt: request.inviteEmailsLastAttemptAt,
        inviteEmailsError: request.inviteEmailsError,
        paidCount: invites.filter((i) => i.status === "paid").length,
        totalCount: invites.length,
        totalAmountCents,
        managerAmountCents,
        playerAmountCents,
        paidAmountCents,
        remainingAmountCents,
        currency: request.paymentCurrency ?? invites.find((i) => i.currency)?.currency ?? "gbp",
        invites: effectiveInvites.map((invite) => ({
          ...invite,
          sponsoredByManager: invite.status === "paid" && invite.emailLastError === "sponsored_by_manager",
        })),
      };
    })(),
    summary: {
      memberCount,
      guardianCount,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    },
    defaults,
    members: rows.map((row, index) => ({
      athleteId: row.athleteId,
      athleteName: row.athleteName,
      birthDate: row.birthDate,
      age: calcAge(row.birthDate),
      trainingPerWeek: row.trainingPerWeek,
      currentProgramTier: row.currentProgramTier,
      isSponsored: row.isSponsored,
      guardianEmail: row.guardianEmail,
      guardianPhone: row.guardianPhone,
      relationToAthlete: row.relationToAthlete,
      sessionsCompleted: row.sessionsCompleted,
      modulesCompleted: row.modulesCompleted,
      rank: index + 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  };
}

export async function getTeamMemberAdmin(input: { teamName: string; athleteId: number }) {
  const cleanTeamName = input.teamName.trim();
  if (!cleanTeamName) return null;

  const rows = await db
    .select({
      athleteId: athleteTable.id,
      athleteUserId: athleteTable.userId,
      team: athleteTable.team,
      athleteName: athleteTable.name,
      birthDate: athleteTable.birthDate,
      trainingPerWeek: athleteTable.trainingPerWeek,
      currentProgramTier: athleteTable.currentProgramTier,
      injuries: athleteTable.injuries,
      growthNotes: athleteTable.growthNotes,
      performanceGoals: athleteTable.performanceGoals,
      equipmentAccess: athleteTable.equipmentAccess,
      createdAt: athleteTable.createdAt,
      updatedAt: athleteTable.updatedAt,
      guardianUserId: guardianTable.userId,
      guardianEmail: guardianTable.email,
      guardianPhone: guardianTable.phoneNumber,
      relationToAthlete: guardianTable.relationToAthlete,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .leftJoin(guardianTable, eq(athleteTable.guardianId, guardianTable.id))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.team !== cleanTeamName) return null;

  return {
    athleteId: row.athleteId,
    athleteUserId: row.athleteUserId,
    team: row.team,
    athleteName: row.athleteName,
    birthDate: row.birthDate,
    trainingPerWeek: row.trainingPerWeek,
    currentProgramTier: row.currentProgramTier,
    injuries: normalizeInjuriesForText(row.injuries),
    growthNotes: row.growthNotes,
    performanceGoals: row.performanceGoals,
    equipmentAccess: row.equipmentAccess,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    guardianUserId: row.guardianUserId,
    guardianEmail: row.guardianEmail,
    guardianPhone: row.guardianPhone,
    relationToAthlete: row.relationToAthlete,
  };
}

export async function updateTeamDefaultsAdmin(input: {
  teamName: string;
  injuries?: string | null;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
}) {
  const cleanTeamName = input.teamName.trim();
  const team = await ensureTeamExists({ name: cleanTeamName });
  if (!team) throw { status: 404, message: "Team not found." };

  await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  const rows = await db
    .update(athleteTable)
    .set({
      injuries: input.injuries?.trim() ? input.injuries.trim() : null,
      growthNotes: input.growthNotes?.trim() ? input.growthNotes.trim() : null,
      performanceGoals: input.performanceGoals?.trim() ? input.performanceGoals.trim() : null,
      equipmentAccess: input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(athleteTable.teamId, team.id))
    .returning({ id: athleteTable.id });

  return {
    updatedCount: rows.length,
  };
}

export async function updateTeamMemberAdmin(input: {
  teamName: string;
  athleteId: number;
  athleteName?: string;
  birthDate?: string | null;
  trainingPerWeek?: number;
  currentProgramTier?: (typeof ProgramType.enumValues)[number] | null;
  injuries?: unknown;
  growthNotes?: string | null;
  performanceGoals?: string | null;
  equipmentAccess?: string | null;
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  relationToAthlete?: string | null;
}) {
  const cleanTeamName = input.teamName.trim();
  const team = await ensureTeamExists({ name: cleanTeamName });
  if (!team) throw { status: 404, message: "Team not found." };

  const athleteRows = await db
    .select({
      id: athleteTable.id,
      teamId: athleteTable.teamId,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  const athlete = athleteRows[0];
  if (!athlete) {
    throw { status: 404, message: "Team member not found." };
  }
  if (athlete.teamId !== team.id) {
    throw { status: 400, message: "Member does not belong to this team." };
  }

  const athletePatch: Partial<typeof athleteTable.$inferInsert> = {};
  if (input.athleteName != null) athletePatch.name = input.athleteName.trim();
  if (input.birthDate !== undefined) athletePatch.birthDate = input.birthDate ? input.birthDate : null;
  if (input.trainingPerWeek !== undefined) athletePatch.trainingPerWeek = input.trainingPerWeek;
  if (input.currentProgramTier !== undefined) athletePatch.currentProgramTier = input.currentProgramTier;
  if (input.injuries !== undefined) {
    if (Array.isArray(input.injuries)) {
      const normalized = input.injuries
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean);
      athletePatch.injuries = normalized.length ? normalized : null;
    } else if (typeof input.injuries === "string") {
      const trimmed = input.injuries.trim();
      athletePatch.injuries = trimmed ? [trimmed] : null;
    } else {
      athletePatch.injuries = null;
    }
  }
  if (input.growthNotes !== undefined)
    athletePatch.growthNotes = input.growthNotes?.trim() ? input.growthNotes.trim() : null;
  if (input.performanceGoals !== undefined)
    athletePatch.performanceGoals = input.performanceGoals?.trim() ? input.performanceGoals.trim() : null;
  if (input.equipmentAccess !== undefined)
    athletePatch.equipmentAccess = input.equipmentAccess?.trim() ? input.equipmentAccess.trim() : null;

  if (Object.keys(athletePatch).length > 0) {
    athletePatch.updatedAt = new Date();
    await db.update(athleteTable).set(athletePatch).where(eq(athleteTable.id, athlete.id));
  }

  const guardianPatch: Partial<typeof guardianTable.$inferInsert> = {};
  if (input.guardianEmail !== undefined) guardianPatch.email = input.guardianEmail?.trim() || null;
  if (input.guardianPhone !== undefined) guardianPatch.phoneNumber = input.guardianPhone?.trim() || null;
  if (input.relationToAthlete !== undefined) guardianPatch.relationToAthlete = input.relationToAthlete?.trim() || null;

  if (Object.keys(guardianPatch).length > 0) {
    if (!athlete.guardianId) {
      throw { status: 400, message: "Adult athletes do not have guardian details." };
    }
    guardianPatch.updatedAt = new Date();
    await db.update(guardianTable).set(guardianPatch).where(eq(guardianTable.id, athlete.guardianId));
  }

  await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  return { ok: true };
}

export async function attachAthleteToTeamAdmin(input: {
  teamName: string;
  athleteId: number;
  allowMoveFromOtherTeam?: boolean;
  isSponsored?: boolean;
  createdByUserId: number;
}) {
  const cleanTeamName = input.teamName.trim();
  const team = await ensureTeamExists({ name: cleanTeamName });
  if (!team) throw { status: 404, message: "Team not found." };

  const rows = await db
    .select({
      id: athleteTable.id,
      teamId: athleteTable.teamId,
      userId: athleteTable.userId,
      guardianId: athleteTable.guardianId,
    })
    .from(athleteTable)
    .innerJoin(userTable, eq(athleteTable.userId, userTable.id))
    .where(and(eq(athleteTable.id, input.athleteId), eq(userTable.isDeleted, false)))
    .limit(1);

  const athlete = rows[0];
  if (!athlete) {
    throw { status: 404, message: "Athlete not found." };
  }

  if (athlete.teamId === team.id) {
    return { ok: true, alreadyInTeam: true };
  }

  // Check team capacity
  const [{ count }] = await db
    .select({ count: sql<number>`count(${athleteTable.id})` })
    .from(athleteTable)
    .where(eq(athleteTable.teamId, team.id));

  const teamWithPlan = await db
    .select({ maxAthletes: teamTable.maxAthletes })
    .from(teamTable)
    .where(eq(teamTable.id, team.id))
    .limit(1);

  const limit = teamWithPlan[0]?.maxAthletes ?? 0;
  if (limit > 0 && count >= limit) {
    throw {
      status: 403,
      message: `Team "${team.name}" is full (${count}/${limit} slots). Please upgrade the plan to add more members.`,
    };
  }

  if (athlete.teamId) {
    if (!input.allowMoveFromOtherTeam) {
      throw {
        status: 400,
        message: `Athlete is already assigned to another team. An athlete can only belong to one team.`,
      };
    }
  }

  const athletePatch: Partial<typeof athleteTable.$inferInsert> = {
    teamId: team.id,
    updatedAt: new Date(),
  };
  // Fetch the full team row once: we need sponsoredPlanId for the sponsored
  // branch AND planId/planExpiresAt to grant tier on non-sponsored attach to
  // an already-active team (otherwise non-sponsored athletes added after
  // approval silently have no access).
  const [fullTeam] = await db
    .select({
      sponsoredPlanId: teamTable.sponsoredPlanId,
      planId: teamTable.planId,
      planExpiresAt: teamTable.planExpiresAt,
      subscriptionStatus: teamTable.subscriptionStatus,
    })
    .from(teamTable)
    .where(eq(teamTable.id, team.id))
    .limit(1);

  if (input.isSponsored) {
    athletePatch.isSponsored = true;
    if (fullTeam?.sponsoredPlanId) {
      const [sponsoredPlan] = await db
        .select({ tier: subscriptionPlanTable.tier, id: subscriptionPlanTable.id })
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.id, fullTeam.sponsoredPlanId))
        .limit(1);
      if (sponsoredPlan?.tier) {
        athletePatch.currentProgramTier = sponsoredPlan.tier;
        athletePatch.currentPlanId = sponsoredPlan.id;
        if (fullTeam.planExpiresAt) athletePatch.planExpiresAt = fullTeam.planExpiresAt;
      }
    }
  } else if (fullTeam?.planId) {
    // Non-sponsored athlete joining an active team — inherit team's base
    // tier so they actually have access. Skips this if the team isn't
    // active (no plan, expired, or never approved).
    const teamActive =
      fullTeam.subscriptionStatus === "active" ||
      (fullTeam.planExpiresAt != null && fullTeam.planExpiresAt > new Date());
    if (teamActive) {
      const [teamPlan] = await db
        .select({ tier: subscriptionPlanTable.tier, id: subscriptionPlanTable.id })
        .from(subscriptionPlanTable)
        .where(eq(subscriptionPlanTable.id, fullTeam.planId))
        .limit(1);
      if (teamPlan?.tier) {
        athletePatch.currentProgramTier = teamPlan.tier;
        athletePatch.currentPlanId = teamPlan.id;
        if (fullTeam.planExpiresAt) athletePatch.planExpiresAt = fullTeam.planExpiresAt;
      }
    }
  }
  await db.update(athleteTable).set(athletePatch).where(eq(athleteTable.id, athlete.id));

  await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, team.id));

  if (athlete.teamId) {
    await db.update(teamTable).set({ updatedAt: new Date() }).where(eq(teamTable.id, athlete.teamId));
  }

  const group = await ensureTeamChatGroup(cleanTeamName, input.createdByUserId);
  if (group?.id) {
    const memberIds: number[] = [athlete.userId];
    if (athlete.guardianId) {
      const guardianRows = await db
        .select({ userId: guardianTable.userId })
        .from(guardianTable)
        .where(eq(guardianTable.id, athlete.guardianId))
        .limit(1);
      const guardianUserId = guardianRows[0]?.userId;
      if (guardianUserId) memberIds.push(guardianUserId);
    }
    await addUsersToGroup(group.id, memberIds);
  }

  return {
    ok: true,
    alreadyInTeam: false,
  };
}

export async function deleteTeamAdmin(teamId: number) {
  const rows = await db
    .select({ id: teamTable.id, name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.id, teamId))
    .limit(1);
  const team = rows[0];
  if (!team) throw { status: 404, message: "Team not found." };

  // Detach athletes from this team (don't delete them — just unlink)
  await db
    .update(athleteTable)
    .set({ teamId: null, team: "", updatedAt: new Date() })
    .where(eq(athleteTable.teamId, teamId));

  // Remove team chat group
  const groups = await db
    .select({ id: chatGroupTable.id })
    .from(chatGroupTable)
    .where(and(eq(chatGroupTable.name, team.name), eq(chatGroupTable.category, "team")))
    .limit(1);
  if (groups[0]) {
    await db.delete(chatGroupMemberTable).where(eq(chatGroupMemberTable.groupId, groups[0].id));
    await db.delete(chatGroupTable).where(eq(chatGroupTable.id, groups[0].id));
  }

  await db.delete(teamTable).where(eq(teamTable.id, teamId));

  return { ok: true, teamId, teamName: team.name };
}

/** Adds a coach-provisioned athlete user to the team chat group (best-effort). */
export async function addTeamAthleteToTeamChat(teamName: string, athleteUserId: number, createdByUserId: number) {
  const group = await ensureTeamChatGroup(teamName.trim(), createdByUserId);
  if (!group?.id) return;
  await addUsersToGroup(group.id, [athleteUserId]);
}
