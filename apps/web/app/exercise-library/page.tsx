"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  fromStorageAudienceLabel,
  AudienceSummary,
  PROGRAM_TIERS,
  isAdultStorageAudienceLabel,
  isProgramTierAudienceLabel,
  normalizeAudienceLabelInput,
  trainingContentRequest,
} from "../../components/admin/training-content-v2/api";

const BASE_AGE_CARDS = Array.from({ length: 12 }, (_, index) => String(index + 7));
const ADULT_TIER_CARDS = PROGRAM_TIERS.map((tier) => tier.label);

type AudienceCard = {
  label: string;
  moduleCount: number;
  otherCount: number;
};

export default function ExerciseLibraryAudiencePage() {
  const searchParams = useSearchParams();
  const [audiences, setAudiences] = useState<AudienceSummary[]>([]);
  const [adultMode, setAdultMode] = useState(searchParams.get("mode") === "adult");
  const [modalOpen, setModalOpen] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAudiences = async () => {
    setIsLoading(true);
    try {
      const data = await trainingContentRequest<{ items: AudienceSummary[] }>("/admin/audiences");
      setAudiences(data.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ages.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAudiences();
  }, []);

  useEffect(() => {
    setAdultMode(searchParams.get("mode") === "adult");
  }, [searchParams]);

  const normalizedAudience = normalizeAudienceLabelInput(audienceInput);

  const cards = useMemo<AudienceCard[]>(() => {
    const youthAudiences = audiences.filter((audience) => {
      if (isAdultStorageAudienceLabel(audience.label)) return false;
      return !isProgramTierAudienceLabel(audience.label);
    });
    const byLabel = new Map(youthAudiences.map((audience) => [normalizeAudienceLabelInput(audience.label), audience]));

    const primary = BASE_AGE_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return {
        label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });

    const additional = youthAudiences
      .filter((audience) => !BASE_AGE_CARDS.includes(normalizeAudienceLabelInput(audience.label)))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map((audience) => ({
        label: normalizeAudienceLabelInput(audience.label),
        moduleCount: audience.moduleCount,
        otherCount: audience.otherCount,
      }));

    return [...primary, ...additional];
  }, [audiences]);

  const adultTierCards = useMemo<AudienceCard[]>(() => {
    const byLabel = new Map(
      audiences
        .filter((audience) => isAdultStorageAudienceLabel(audience.label))
        .map((audience) => [fromStorageAudienceLabel(audience.label), audience])
    );
    return ADULT_TIER_CARDS.map((label) => {
      const existing = byLabel.get(label);
      return {
        label,
        moduleCount: existing?.moduleCount ?? 0,
        otherCount: existing?.otherCount ?? 0,
      };
    });
  }, [audiences]);

  return (
    <AdminShell
      title="Exercise library"
      subtitle={
        adultMode
          ? "Adult mode is on. Open a tier to manage adult modules and other content."
          : "Organized by age. Open an age card to manage modules and session content."
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-1 sm:w-fit">
                <Button variant={adultMode ? "outline" : "default"} onClick={() => setAdultMode(false)}>
                  Youth mode
                </Button>
                <Button variant={adultMode ? "default" : "outline"} onClick={() => setAdultMode(true)}>
                  Adult mode
                </Button>
              </div>
              <SectionHeader
                title={adultMode ? "Adult tiers" : "Age groups"}
                description={
                  adultMode
                    ? "Choose a tier to manage adult modules and other content."
                    : "Start with ages 7 to 18. Open any card to manage modules, sessions, warm-up, sessions A/B/C, mobility, recovery, and cool-down content."
                }
              />
              {!adultMode ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setAudienceInput("");
                    setModalOpen(true);
                  }}
                >
                  + Add age or range
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {isLoading ? <p className="text-sm text-muted-foreground">{adultMode ? "Loading tiers..." : "Loading age groups..."}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(adultMode ? adultTierCards : cards).map((audience) => (
                <Link
                  key={audience.label}
                  href={`/exercise-library/${encodeURIComponent(audience.label)}${adultMode ? "?mode=adult" : ""}`}
                  className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <p className="text-lg font-semibold text-foreground">{adultMode ? audience.label : `Age ${audience.label}`}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {audience.moduleCount} modules · {audience.otherCount} other items
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add age group</DialogTitle>
            <DialogDescription>
              Enter a value like 7, 8, 12, 7-18, or All.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="7, 8, 12, 7-18, All"
              value={audienceInput}
              onChange={(event) => setAudienceInput(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!normalizedAudience) return;
                  try {
                    await trainingContentRequest("/admin/audiences", {
                      method: "POST",
                      body: JSON.stringify({ label: normalizedAudience }),
                    });
                    setAudienceInput("");
                    setModalOpen(false);
                    await loadAudiences();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to create audience.");
                  }
                }}
                disabled={!normalizedAudience}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
