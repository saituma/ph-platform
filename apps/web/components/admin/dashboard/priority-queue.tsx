import { Badge } from "../../ui/badge";
import { EmptyState } from "../empty-state";
import { Skeleton } from "../../ui/skeleton";

type QueueItem = {
  title: string;
  detail: string;
  status: string;
};

type PriorityQueueProps = {
  items: QueueItem[];
  isLoading?: boolean;
};

export function PriorityQueue({ items, isLoading = false }: PriorityQueueProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`queue-skeleton-${index}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState title="Queue cleared" description="No urgent tasks right now." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.detail}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm transition hover:border-primary/40"
        >
          <div>
            <p className="font-semibold text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </div>
          <Badge variant="outline">{item.status}</Badge>
        </div>
      ))}
    </div>
  );
}
