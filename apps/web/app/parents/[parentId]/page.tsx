"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  MessageCircle,
  Clock,
  Send,
  ChevronRight,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getOrCreateAdminSocket } from "../../../lib/admin-socket";

import { AdminShell } from "../../../components/admin/shell";
import { useGetUsersQuery, useGetUserOnboardingQuery } from "../../../lib/apiSlice";
import { cn } from "../../../lib/utils";

type AnyRow = Record<string, unknown>;

type FeedbackReply = {
  id: number;
  content: string;
  createdAt: string;
  senderId: number;
  senderName: string;
  senderRole: string;
};

type FeedbackThread = {
  id: number;
  subject: string;
  status: "open" | "resolved";
  createdAt: string;
  updatedAt: string;
  guardianUserId: number;
  guardianName: string;
  guardianEmail: string;
  replies?: FeedbackReply[];
};

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("csrfToken="))
      ?.split("=")
      .slice(1)
      .join("=") ?? ""
  );
}

function apiFetch(path: string, init?: RequestInit) {
  const csrf = getCsrfToken();
  return fetch(`/api/backend${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
}

function ParentFeedbackSection({ userId }: { userId: number }) {
  const [threads, setThreads] = useState<FeedbackThread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeThread, setActiveThread] = useState<FeedbackThread | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await apiFetch("/portal/admin/feedback");
    if (!res.ok) return;
    const data: { threads: FeedbackThread[] } = await res.json();
    setThreads(data.threads.filter((t) => t.guardianUserId === userId));
  }, [userId]);

  const loadThread = useCallback(async (id: number) => {
    const res = await apiFetch(`/portal/admin/feedback/${id}`);
    if (!res.ok) return;
    const data: FeedbackThread = await res.json();
    setActiveThread(data);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.replies]);

  // Real-time: refresh when guardian sends a new message
  useEffect(() => {
    const s = getOrCreateAdminSocket();
    const handler = ({ feedbackId }: { feedbackId: number }) => {
      loadThreads();
      if (activeId === feedbackId) loadThread(feedbackId);
    };
    s.on("guardian:feedback:new", handler);
    s.on("guardian:feedback:reply", handler);
    return () => { s.off("guardian:feedback:new", handler); s.off("guardian:feedback:reply", handler); };
  }, [activeId, loadThread, loadThreads]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await apiFetch(`/portal/admin/feedback/${activeId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      await Promise.all([loadThread(activeId), loadThreads()]);
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleStatus() {
    if (!activeId || !activeThread) return;
    setResolving(true);
    const newStatus = activeThread.status === "resolved" ? "open" : "resolved";
    try {
      const res = await apiFetch(`/portal/admin/feedback/${activeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      await Promise.all([loadThread(activeId), loadThreads()]);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setResolving(false);
    }
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-5 py-3">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-black uppercase tracking-widest text-foreground">Parent Feedback</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <MessageCircle className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No feedback threads yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Messages from this parent will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-5 py-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-black uppercase tracking-widest text-foreground">Parent Feedback</h2>
        <span className="ml-auto text-xs text-muted-foreground">{threads.length} thread{threads.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="flex min-h-0" style={{ height: "420px" }}>
        {/* Thread list */}
        <div className="w-56 flex-shrink-0 border-r border-border overflow-y-auto">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={`w-full flex items-start gap-2.5 px-3.5 py-3 text-left hover:bg-muted/40 transition-colors border-b border-border/50 ${activeId === t.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {t.status === "resolved"
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  : <Clock className="h-3.5 w-3.5 text-amber-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{t.subject}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{format(new Date(t.updatedAt), "d MMM · HH:mm")}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${t.status === "resolved" ? "text-emerald-500" : "text-amber-500"}`}>{t.status}</span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 mt-1 flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Thread detail */}
        {activeId && activeThread ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate uppercase tracking-wide">{activeThread.subject}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Started {format(new Date(activeThread.createdAt), "d MMM yyyy")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={resolving}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeThread.status === "resolved"
                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                }`}
              >
                {activeThread.status === "resolved" ? <><Clock className="h-3 w-3" /> Reopen</> : <><CheckCircle2 className="h-3 w-3" /> Resolve</>}
              </button>
              <button type="button" onClick={() => setActiveId(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {(activeThread.replies ?? []).map((r) => {
                const isCoach = r.senderRole !== "guardian";
                return (
                  <div key={r.id} className={`flex ${isCoach ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 ${isCoach ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"}`}>
                      {!isCoach && (
                        <p className="text-[9px] font-bold uppercase tracking-wide opacity-60 mb-1">Parent</p>
                      )}
                      <p className="text-xs leading-relaxed">{r.content}</p>
                      <p className={`text-[9px] mt-1 opacity-50 font-mono ${isCoach ? "text-right" : "text-left"}`}>
                        {r.senderName} · {format(new Date(r.createdAt), "d MMM · HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply */}
            {activeThread.status !== "resolved" ? (
              <form onSubmit={handleReply} className="flex items-end gap-2 px-3 py-2.5 border-t border-border flex-shrink-0">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(e as unknown as React.FormEvent); } }}
                  rows={2}
                  placeholder="Reply to parent… (Enter to send)"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <button
                  type="submit"
                  disabled={!reply.trim() || sending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0 self-end"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <div className="px-4 py-2.5 border-t border-border text-center flex-shrink-0">
                <p className="text-[10px] text-muted-foreground font-mono flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Resolved — reopen to reply
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/15 mb-2" />
              <p className="text-xs text-muted-foreground">Select a thread to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    if ("notes" in o) return String(o.notes ?? "");
    return JSON.stringify(val);
  }
  return String(val);
}

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
                <p className="text-sm text-foreground leading-relaxed">{toStr(athlete.injuries)}</p>
              </div>
              {athlete.growthNotes && (
                <div className="py-3 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Growth notes</p>
                  <p className="text-sm text-foreground leading-relaxed">{toStr(athlete.growthNotes)}</p>
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

        {/* Guardian feedback threads */}
        <ParentFeedbackSection userId={userId} />
      </div>
    </AdminShell>
  );
}
