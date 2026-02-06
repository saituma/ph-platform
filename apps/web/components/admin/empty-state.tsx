import { Button } from "../ui/button";
import { Card } from "../ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionLabel }: EmptyStateProps) {
  return (
    <Card className="border-dashed bg-secondary/40 p-8 text-center">
      <div className="mx-auto max-w-sm space-y-3">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {actionLabel ? (
          <div className="pt-2">
            <Button variant="outline">{actionLabel}</Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
