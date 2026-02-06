import { Button } from "../../ui/button";

type QuickActionsProps = {
  items: string[];
  onSelect: (action: string) => void;
  isLoading?: boolean;
};

export function QuickActions({ items, onSelect, isLoading = false }: QuickActionsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`action-skeleton-${index}`}
            className="h-12 w-full rounded-2xl border border-border bg-secondary/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((action) => (
        <Button
          key={action}
          variant="outline"
          className="h-12 w-full justify-between rounded-2xl px-4"
          onClick={() => onSelect(action)}
        >
          {action}
          <span className="text-xs text-muted-foreground">Open</span>
        </Button>
      ))}
    </div>
  );
}
