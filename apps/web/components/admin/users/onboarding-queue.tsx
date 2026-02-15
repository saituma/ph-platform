import { Button } from "../../ui/button";

type QueueItem = {
  id: number;
  name: string;
  onboarding: string;
};

type OnboardingQueueProps = {
  items: QueueItem[];
  onReview: (userId: number) => void;
  onAssign: (userId: number) => void;
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
          key={user.id}
          className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm"
        >
          <p className="font-semibold text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.onboarding}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => onReview(user.id)}>
              Review
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAssign(user.id)}>
              Assign Program
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
