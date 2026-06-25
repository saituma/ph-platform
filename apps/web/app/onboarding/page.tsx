"use client";

import { skipToken } from "@reduxjs/toolkit/query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  HeartPulse,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";

import { EmptyState } from "../../components/admin/empty-state";
import { AdminShell } from "../../components/admin/shell";
import { Badge, type BadgeProps } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import {
  type AdminOnboardingAthleteType,
  type AdminOnboardingDetail,
  type AdminOnboardingListItem,
  type AdminOnboardingSections,
  useGetIncompleteOnboardingAthletesQuery,
  useGetOnboardingAthleteDetailQuery,
} from "../../lib/apiSlice";
import { cn } from "../../lib/utils";

const FILTERS: Array<{ label: string; value: AdminOnboardingAthleteType }> = [
  { label: "All", value: "all" },
  { label: "Youth", value: "youth" },
  { label: "Adult", value: "adult" },
  { label: "Team", value: "team" },
];

const SECTION_LABELS: Array<{
  key: keyof AdminOnboardingSections;
  label: string;
}> = [
  { key: "basic", label: "Basic" },
  { key: "training", label: "Training" },
  { key: "health", label: "Health" },
  { key: "agreements", label: "Legal" },
  { key: "billing", label: "Billing" },
];

const PROGRAM_LABELS: Record<string, string> = {
  PHP: "PHP",
  PHP_Premium: "PHP Premium",
  PHP_Premium_Plus: "PHP Premium Plus",
  PHP_Pro: "PHP Pro",
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRole(value?: string | null): string {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function programLabel(value?: string | null): string {
  if (!value) return "-";
  return PROGRAM_LABELS[value] ?? value;
}

function categoryLabel(value?: string | null): string {
  if (value === "team") return "Team";
  if (value === "adult") return "Adult";
  if (value === "youth") return "Youth";
  return value ? formatRole(value) : "-";
}

function categoryVariant(value?: string | null): BadgeProps["variant"] {
  if (value === "team") return "info";
  if (value === "adult") return "secondary";
  if (value === "youth") return "warning";
  return "outline";
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function JsonBlock({
  value,
  emptyLabel,
}: {
  value: unknown;
  emptyLabel: string;
}) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (isObjectRecord(value) && Object.keys(value).length === 0)
  ) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SectionPills({ sections }: { sections: AdminOnboardingSections }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SECTION_LABELS.map(({ key, label }) => {
        const complete = sections[key];
        return (
          <span
            key={key}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] font-medium",
              complete
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {complete ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {label}
          </span>
        );
      })}
    </div>
  );
}

function AthleteRow({
  item,
  selected,
  onSelect,
}: {
  item: AdminOnboardingListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {item.athleteName}
            </p>
            <Badge variant={categoryVariant(item.category)} size="sm">
              {categoryLabel(item.category)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.userEmail ?? item.guardianEmail ?? "No email saved"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          #{item.athleteId}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="min-w-0 truncate">
          Age: <span className="text-foreground">{display(item.age)}</span>
        </div>
        <div className="min-w-0 truncate">
          Team: <span className="text-foreground">{display(item.teamName)}</span>
        </div>
        <div className="min-w-0 truncate">
          Program:{" "}
          <span className="text-foreground">
            {programLabel(item.currentProgramTier)}
          </span>
        </div>
        <div className="min-w-0 truncate">
          Updated:{" "}
          <span className="text-foreground">{formatDate(item.updatedAt)}</span>
        </div>
      </div>

      <div className="mt-3">
        <SectionPills sections={item.sections} />
      </div>
    </button>
  );
}

function FieldGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-lg bg-muted/35 px-3 py-2">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-xl border border-border p-4">
            <Skeleton className="mb-4 h-5 w-36" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DetailPanel({
  detail,
  isLoading,
  hasSelection,
  isError,
}: {
  detail?: AdminOnboardingDetail;
  isLoading: boolean;
  hasSelection: boolean;
  isError: boolean;
}) {
  if (!hasSelection) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No pending onboarding"
        description="Every athlete in the current filter has completed onboarding."
      />
    );
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !detail) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Unable to load onboarding"
        description="Refresh the list and try opening the athlete again."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="min-w-0 truncate">
          {detail.athlete.name}
        </CardTitle>
        <CardDescription className="min-w-0 truncate">
          Saved onboarding data for athlete #{detail.athlete.id}
        </CardDescription>
        <CardAction>
          <Badge variant="warning">Incomplete</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionPills sections={detail.sections} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/users/${detail.account.userId}`} />}
            >
              <ExternalLink className="h-4 w-4" />
              User
            </Button>
            {detail.team?.id ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/teams/${detail.team.id}`} />}
              >
                <ExternalLink className="h-4 w-4" />
                Team
              </Button>
            ) : null}
          </div>
        </div>

        <DetailSection title="Account" icon={UserRound}>
          <FieldGrid
            items={[
              { label: "User ID", value: detail.account.userId },
              { label: "Role", value: formatRole(detail.account.role) },
              { label: "Name", value: display(detail.account.name) },
              { label: "Email", value: display(detail.account.email) },
              { label: "Blocked", value: display(detail.account.isBlocked) },
              { label: "Created", value: formatDateTime(detail.athlete.createdAt) },
            ]}
          />
        </DetailSection>

        <DetailSection title="Athlete Profile" icon={ClipboardList}>
          <FieldGrid
            items={[
              { label: "Athlete ID", value: detail.athlete.id },
              { label: "Category", value: categoryLabel(detail.athlete.category) },
              { label: "Athlete Type", value: categoryLabel(detail.athlete.athleteType) },
              { label: "Age", value: display(detail.athlete.age) },
              { label: "Birth Date", value: formatDate(detail.athlete.birthDate) },
              { label: "Phone", value: display(detail.athlete.phoneNumber) },
              { label: "Team", value: display(detail.athlete.team) },
              { label: "Updated", value: formatDateTime(detail.athlete.updatedAt) },
            ]}
          />
        </DetailSection>

        <DetailSection title="Guardian" icon={Users}>
          {detail.guardian ? (
            <FieldGrid
              items={[
                { label: "Guardian ID", value: detail.guardian.id },
                { label: "User ID", value: detail.guardian.userId },
                { label: "Name", value: display(detail.guardian.userName) },
                {
                  label: "Email",
                  value: display(detail.guardian.email ?? detail.guardian.userEmail),
                },
                { label: "Phone", value: display(detail.guardian.phoneNumber) },
                {
                  label: "Relation",
                  value: display(detail.guardian.relationToAthlete),
                },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No guardian record is attached to this athlete.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Training" icon={CalendarDays}>
          <FieldGrid
            items={[
              {
                label: "Sessions Per Week",
                value: display(detail.athlete.trainingPerWeek),
              },
              {
                label: "Preferred Days",
                value: display(detail.athlete.preferredTrainingDays),
              },
              {
                label: "Equipment",
                value: display(detail.athlete.equipmentAccess),
              },
              {
                label: "Goals",
                value: display(detail.athlete.performanceGoals),
              },
              {
                label: "Growth Notes",
                value: display(detail.athlete.growthNotes),
              },
              {
                label: "Youth Tracking",
                value: display(detail.athlete.youthTrackingEnabled),
              },
            ]}
          />
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Injuries
            </p>
            <JsonBlock value={detail.athlete.injuries} emptyLabel="No injuries saved." />
          </div>
        </DetailSection>

        <DetailSection title="Health" icon={HeartPulse}>
          <JsonBlock
            value={detail.healthForm}
            emptyLabel="No health form data has been saved."
          />
        </DetailSection>

        <DetailSection title="Legal Acceptance" icon={ShieldCheck}>
          {detail.legalAcceptance ? (
            <JsonBlock
              value={detail.legalAcceptance}
              emptyLabel="No legal acceptance saved."
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No legal acceptance has been saved.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Billing" icon={ShieldCheck}>
          <FieldGrid
            items={[
              { label: "Tier", value: programLabel(detail.athlete.currentProgramTier) },
              { label: "Plan ID", value: display(detail.athlete.currentPlanId) },
              { label: "Payment Type", value: display(detail.athlete.planPaymentType) },
              {
                label: "Commitment",
                value: detail.athlete.planCommitmentMonths
                  ? `${detail.athlete.planCommitmentMonths} months`
                  : "-",
              },
              { label: "Expires", value: formatDateTime(detail.athlete.planExpiresAt) },
              { label: "Sponsored", value: display(detail.athlete.isSponsored) },
            ]}
          />
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subscription Plan
            </p>
            <JsonBlock value={detail.plan} emptyLabel="No plan record is linked." />
          </div>
        </DetailSection>

        <DetailSection title="Additional Responses" icon={ClipboardList}>
          <JsonBlock
            value={detail.extraResponses}
            emptyLabel="No additional onboarding responses saved."
          />
        </DetailSection>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [athleteType, setAthleteType] =
    useState<AdminOnboardingAthleteType>("all");
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(
    null,
  );

  const listQuery = useGetIncompleteOnboardingAthletesQuery({
    q: submittedSearch || undefined,
    athleteType,
    limit: 100,
  });

  const athletes = useMemo(
    () => listQuery.data?.items ?? [],
    [listQuery.data?.items],
  );
  const selectedItem =
    athletes.find((item) => item.athleteId === selectedAthleteId) ??
    athletes[0] ??
    null;
  const activeAthleteId = selectedItem?.athleteId ?? null;

  const detailQuery = useGetOnboardingAthleteDetailQuery(
    activeAthleteId ?? skipToken,
  );

  const stats = useMemo(() => {
    const missingHealth = athletes.filter((item) => !item.sections.health).length;
    const missingBilling = athletes.filter((item) => !item.sections.billing).length;
    return {
      pending: listQuery.data?.total ?? athletes.length,
      visible: athletes.length,
      missingHealth,
      missingBilling,
    };
  }, [athletes, listQuery.data?.total]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim());
    setSelectedAthleteId(null);
  }

  return (
    <AdminShell
      title="Onboarding"
      subtitle="Incomplete athlete onboarding review"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void listQuery.refetch();
            if (activeAthleteId) void detailQuery.refetch();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Pending onboarding"
            value={stats.pending}
            icon={ClipboardList}
            tone="bg-primary/10 text-primary"
          />
          <StatTile
            label="Shown in list"
            value={stats.visible}
            icon={Users}
            tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
          />
          <StatTile
            label="Missing health"
            value={stats.missingHealth}
            icon={HeartPulse}
            tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
          />
          <StatTile
            label="Missing billing"
            value={stats.missingBilling}
            icon={ShieldCheck}
            tone="bg-amber-500/10 text-amber-700 dark:text-amber-300"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Pending Athletes</CardTitle>
              <CardDescription>
                Athletes where onboarding is still marked incomplete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    nativeInput
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search athlete, email, guardian, team"
                    className="[&_[data-slot=input]]:pl-9"
                  />
                </div>
                <Button type="submit" variant="secondary">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={athleteType === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAthleteType(filter.value);
                      setSelectedAthleteId(null);
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              {listQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Skeleton key={item} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : listQuery.isError ? (
                <EmptyState
                  icon={AlertCircle}
                  title="Unable to load athletes"
                  description="The incomplete onboarding list could not be loaded."
                  actionLabel="Retry"
                  onAction={() => void listQuery.refetch()}
                />
              ) : athletes.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No incomplete onboarding"
                  description="There are no athletes matching this filter."
                />
              ) : (
                <div className="space-y-3">
                  {athletes.map((item) => (
                    <AthleteRow
                      key={item.athleteId}
                      item={item}
                      selected={item.athleteId === activeAthleteId}
                      onSelect={() => setSelectedAthleteId(item.athleteId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DetailPanel
            detail={detailQuery.data}
            isLoading={detailQuery.isFetching}
            hasSelection={Boolean(activeAthleteId)}
            isError={detailQuery.isError}
          />
        </div>
      </div>
    </AdminShell>
  );
}
