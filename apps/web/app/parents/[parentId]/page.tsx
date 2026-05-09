"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Baby,
  Calendar,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Mail,
  Phone,
  Shield,
  Target,
  Users,
  Activity,
  AlertTriangle,
  UserCheck,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";

import { AdminShell } from "../../../components/admin/shell";
import { useGetUsersQuery, useGetUserOnboardingQuery } from "../../../lib/apiSlice";
import { cn } from "../../../lib/utils";

type AnyRow = Record<string, unknown>;

function Field({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: React.ComponentType<{ className?: string }> }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-foreground">{String(value)}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-5 py-3">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h2 className="text-xs font-black uppercase tracking-widest text-foreground">{title}</h2>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

export default function ParentDetailPage() {
  const { parentId } = useParams<{ parentId: string }>();
  const userId = Number(parentId);
  const router = useRouter();

  const { data: usersData } = useGetUsersQuery();
  const { data: onboarding, isLoading } = useGetUserOnboardingQuery(userId, {
    skip: !userId || !Number.isFinite(userId),
  });

  const user = useMemo(() => {
    const all = usersData?.users ?? [];
    return (all as AnyRow[]).find((u) => Number(u.id) === userId) as AnyRow | undefined;
  }, [usersData, userId]);

  const guardian = onboarding?.guardian;
  const athlete = onboarding?.athlete;

  const extraResponses = (athlete?.extraResponses ?? {}) as Record<string, unknown>;

  // Parse expectations from extraResponses if stored there
  const expectations = Array.isArray(extraResponses.expectations)
    ? (extraResponses.expectations as string[])
    : [];
  const updateFrequency = extraResponses.updateFrequency as string | undefined;
  const contactMethod = extraResponses.contactMethod as string | undefined;
  const athleteType = extraResponses.athleteType as string | undefined;
  const sport = extraResponses.sport as string | undefined;

  const displayName = String(user?.name ?? "Parent");
  const displayEmail = String(user?.email ?? guardian?.email ?? "");
  const isOnboarded = Boolean(user?.onboardingCompleted);
  const isBlocked = Boolean(user?.isBlocked);

  const EXPECTATION_LABELS: Record<string, string> = {
    progress_reports:  "Progress Reports",
    direct_messaging:  "Direct Messaging",
    injury_alerts:     "Injury Alerts",
    training_schedule: "Training Schedule",
    milestones:        "Milestones",
    nutrition:         "Nutrition Guidance",
    video_feedback:    "Video Feedback",
    goal_setting:      "Goal Setting",
  };

  if (isLoading) {
    return (
      <AdminShell title="Parent Profile" subtitle="Loading…">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-2xl bg-muted" />)}
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={displayName}
      subtitle="Parent / guardian profile"
      actions={
        <Link
          href="/parents"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          All parents
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Hero card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <span className="text-2xl font-black text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black text-foreground">{displayName}</h1>
                {isOnboarded && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-3 w-3" /> Onboarded
                  </span>
                )}
                {isBlocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                    <Shield className="h-3 w-3" /> Blocked
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{displayEmail}</p>
              {user?.createdAt ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Joined {format(new Date(String(user.createdAt)), "MMMM d, yyyy")}
                </p>
              ) : null}
            </div>
            <Link
              href={`/users/${userId}`}
              className="flex-shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              View full user
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Guardian info */}
          <SectionCard title="Guardian Details" icon={Shield}>
            <Field label="Full name"        value={displayName}                            icon={Shield} />
            <Field label="Email"            value={displayEmail}                           icon={Mail} />
            <Field label="Phone"            value={guardian?.phoneNumber}                  icon={Phone} />
            <Field label="Relation to child" value={guardian?.relationToAthlete}           icon={Baby} />
            <Field label="Current plan tier" value={guardian?.currentProgramTier}          icon={CreditCard} />
            <Field
              label="Account created"
              value={guardian?.createdAt ? format(new Date(guardian.createdAt), "PPP") : undefined}
              icon={Calendar}
            />
          </SectionCard>

          {/* Child (athlete) profile */}
          {athlete && (
            <SectionCard title="Child Profile" icon={Baby}>
              <Field label="Child's name"     value={athlete.name}                         icon={Baby} />
              <Field label="Age"              value={athlete.age}                          icon={Calendar} />
              <Field label="Team"             value={athlete.team}                         icon={Users} />
              <Field
                label="Athlete type"
                value={athleteType ?? (athlete.age != null && athlete.age < 18 ? "Youth" : "Adult")}
                icon={Activity}
              />
              <Field label="Sport"            value={sport}                                icon={Trophy} />
              <Field label="Training / week"  value={athlete.trainingPerWeek != null ? `${athlete.trainingPerWeek}x per week` : undefined} icon={ClipboardList} />
              <Field label="Performance goals" value={athlete.performanceGoals}            icon={Target} />
              <Field
                label="Plan"
                value={[
                  athlete.currentProgramTier,
                  athlete.planPaymentType,
                  athlete.planCommitmentMonths ? `${athlete.planCommitmentMonths} months` : null,
                ].filter(Boolean).join(" · ") || undefined}
                icon={CreditCard}
              />
              <Field
                label="Onboarding completed"
                value={athlete.onboardingCompletedAt
                  ? format(new Date(athlete.onboardingCompletedAt), "PPP")
                  : athlete.onboardingCompleted ? "Yes" : "No"}
                icon={CheckCircle2}
              />
            </SectionCard>
          )}

          {/* Medical / injury notes */}
          {athlete?.injuries && (
            <SectionCard title="Medical Notes" icon={AlertTriangle}>
              <div className="py-3">
                <p className="text-sm text-foreground leading-relaxed">{athlete.injuries}</p>
              </div>
              {athlete.growthNotes && (
                <div className="py-3 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Growth notes</p>
                  <p className="text-sm text-foreground leading-relaxed">{athlete.growthNotes}</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Coaching expectations (from apps/parent onboarding) */}
          {expectations.length > 0 && (
            <SectionCard title="Coaching Expectations" icon={CheckCircle2}>
              <div className="py-3 flex flex-wrap gap-2">
                {expectations.map((exp) => (
                  <span
                    key={exp}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {EXPECTATION_LABELS[exp] ?? exp}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Communication preferences (from apps/parent onboarding) */}
          {(updateFrequency || contactMethod) && (
            <SectionCard title="Communication Preferences" icon={Mail}>
              <Field label="Update frequency" value={updateFrequency} icon={Calendar} />
              <Field label="Contact method"   value={contactMethod}   icon={Mail} />
            </SectionCard>
          )}

          {/* Extra responses (catch-all for any remaining onboarding data) */}
          {Object.keys(extraResponses).filter(
            (k) => !["expectations", "updateFrequency", "contactMethod", "athleteType", "sport"].includes(k)
          ).length > 0 && (
            <SectionCard title="Additional Onboarding Responses" icon={ClipboardList}>
              {Object.entries(extraResponses)
                .filter(([k]) => !["expectations", "updateFrequency", "contactMethod", "athleteType", "sport"].includes(k))
                .map(([key, value]) => (
                  <Field
                    key={key}
                    label={key.replace(/_/g, " ")}
                    value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                  />
                ))}
            </SectionCard>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
