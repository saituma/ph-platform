import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { cn } from "../../../lib/utils";

type UserSummary = { id: number; name?: string | null; email?: string | null };
type OnboardingData = {
  guardian?: { phoneNumber?: string; relationToAthlete?: string };
  athlete?: {
    name?: string;
    age?: number;
    team?: string;
    trainingPerWeek?: number;
    performanceGoals?: string;
    equipmentAccess?: string;
    injuries?: unknown;
  };
};

type CompletedOnboardingCardProps = {
  completedGuardians: UserSummary[];
  selectedUserId: number | null;
  selectedGuardian?: UserSummary;
  onboardingData?: OnboardingData;
  extraLevel: string | null;
  extraEntries: string[];
  onSelectUser: (id: number | null) => void;
};

export function CompletedOnboardingCard({
  completedGuardians,
  selectedUserId,
  selectedGuardian,
  onboardingData,
  extraLevel,
  extraEntries,
  onSelectUser,
}: CompletedOnboardingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Completed Onboarding</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 text-sm text-muted-foreground lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Guardians</p>
          <div className="space-y-2">
            {completedGuardians.length ? (
              completedGuardians.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelectUser(user.id)}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-2 text-left text-sm",
                    selectedUserId === user.id
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary/50"
                  )}
                >
                  <p className="text-foreground">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                No completed onboarding records yet.
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
          {selectedUserId && onboardingData ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Details</p></div>
                <Button variant="ghost" size="sm" onClick={() => onSelectUser(null)} className="h-8 w-8 rounded-full p-0">✕</Button>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Guardian</p>
                <div className="mt-2 grid gap-2 text-sm text-foreground">
                  <p><span className="text-muted-foreground">Name:</span> {selectedGuardian?.name || "—"}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selectedGuardian?.email || "—"}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {onboardingData.guardian?.phoneNumber || "—"}</p>
                  <p><span className="text-muted-foreground">Relation:</span> {onboardingData.guardian?.relationToAthlete || "—"}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Athlete</p>
                <div className="mt-2 grid gap-2 text-sm text-foreground">
                  <p><span className="text-muted-foreground">Name:</span> {onboardingData.athlete?.name || "—"}</p>
                  <p><span className="text-muted-foreground">Age:</span> {onboardingData.athlete?.age ?? "—"}</p>
                  <p><span className="text-muted-foreground">Team:</span> {onboardingData.athlete?.team || "—"}</p>
                  <p><span className="text-muted-foreground">Level:</span> {extraLevel ?? "—"}</p>
                  <p><span className="text-muted-foreground">Training days:</span> {onboardingData.athlete?.trainingPerWeek ?? "—"}</p>
                  <p><span className="text-muted-foreground">Goals:</span> {onboardingData.athlete?.performanceGoals || "—"}</p>
                  <p><span className="text-muted-foreground">Equipment:</span> {onboardingData.athlete?.equipmentAccess || "—"}</p>
                  <p><span className="text-muted-foreground">Injuries:</span> {onboardingData.athlete?.injuries ? JSON.stringify(onboardingData.athlete.injuries) : "—"}</p>
                  <p><span className="text-muted-foreground">Extra responses:</span> {extraEntries.length ? extraEntries.join(", ") : "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Select a guardian to see their onboarding details.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
