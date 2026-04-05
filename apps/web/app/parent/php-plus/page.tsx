"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Info } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  useGetOnboardingConfigQuery,
  useUpdatePhpPlusTabsMutation,
} from "../../../lib/apiSlice";
import { cn } from "../../../lib/utils";

const PREMIUM_PROGRAM_TABS = [
  "Program",
  "Warmups",
  "Cool Downs",
  "Mobility",
  "Recovery",
  "In-Season Program",
  "Off-Season Program",
  "Video Upload",
  "Submit Diary",
  "Bookings",
];

export default function ParentPhpPlusPage() {
  const { data } = useGetOnboardingConfigQuery();
  const [updatePhpPlusTabs, { isLoading: isSavingTabs }] = useUpdatePhpPlusTabsMutation();
  const [phpPlusProgramTabs, setPhpPlusProgramTabs] = useState<string[]>(PREMIUM_PROGRAM_TABS);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!data?.config) return;
    const config = data.config as Record<string, unknown>;
    const rawPlusTabs = Array.isArray(config.phpPlusProgramTabs) ? config.phpPlusProgramTabs : [];
    const normalized = rawPlusTabs
      .map((tab) => String(tab))
      .filter((tab) => PREMIUM_PROGRAM_TABS.includes(tab));
    setPhpPlusProgramTabs(normalized.length ? normalized : PREMIUM_PROGRAM_TABS);
  }, [data]);

  const handleSavePhpPlusPrograms = async () => {
    try {
      await updatePhpPlusTabs({ tabs: phpPlusProgramTabs }).unwrap();
      setSaveStatus({ type: "success", message: "PHP Premium Plus programs updated." });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
      setSaveStatus({ type: "error", message: message || "Failed to update programs." });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const selectedCount = phpPlusProgramTabs.length;
  const totalCount = PREMIUM_PROGRAM_TABS.length;

  return (
    <ParentShell
      title="PHP Premium Plus Programs"
      subtitle="Choose which programs are included for PHP Premium Plus subscribers."
      actions={
        <Link
          href="/parent"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>
      }
    >
      <div className="space-y-8">
        {saveStatus ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              saveStatus.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
            )}
          >
            {saveStatus.message}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {selectedCount} / {totalCount}
                </p>
                <p className="text-xs text-muted-foreground">Programs enabled for PHP Premium Plus</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                These tabs appear in the mobile app for users on the PHP Premium Plus plan. Toggle each
                program to include or exclude it from the plan.
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>PHP Premium Plus Plan Programs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select which programs are included for PHP Premium Plus.
              </p>
            </div>
            <Button onClick={handleSavePhpPlusPrograms} disabled={isSavingTabs}>
              {isSavingTabs ? "Saving..." : "Save Selection"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              {PREMIUM_PROGRAM_TABS.map((tab) => {
                const checked = phpPlusProgramTabs.includes(tab);
                return (
                  <label
                    key={tab}
                    className="flex items-start gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        setPhpPlusProgramTabs((prev) => {
                          if (event.target.checked) {
                            return prev.includes(tab) ? prev : [...prev, tab];
                          }
                          return prev.filter((item) => item !== tab);
                        });
                      }}
                    />
                    <span className="font-medium text-foreground">{tab}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ParentShell>
  );
}
