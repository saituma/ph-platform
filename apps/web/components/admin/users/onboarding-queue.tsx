import { Button } from "../../ui/button";

type QueueItem = {
  name: string;
  onboarding: string;
};

type OnboardingQueueProps = {
  items: QueueItem[];
  onReview: (name: string) => void;
  onAssign: (name: string) => void;
};

export function OnboardingQueue({ items, onReview, onAssign }: OnboardingQueueProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
        No pending onboarding reviews.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((user) => (
        <div
          key={user.name}
          className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm"
        >
          <p className="font-semibold text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.onboarding}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => onReview(user.name)}>
              Review
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAssign(user.name)}>
              Assign Program
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
