import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { EmptyState } from "../empty-state";
import { Skeleton } from "../../ui/skeleton";

type ProgramItem = {
  name: string;
  summary: string;
  access: string;
};

type ProgramsGridProps = {
  programs: ProgramItem[];
  isLoading?: boolean;
  onManage: (program: ProgramItem) => void;
  onAssign: (program: ProgramItem) => void;
};

export function ProgramsGrid({
  programs,
  isLoading = false,
  onManage,
  onAssign,
}: ProgramsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`program-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <EmptyState
        title="No programs yet"
        description="Create your first training program template."
        actionLabel="Create Template"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {programs.map((program) => (
        <Card key={program.name} className="hover:border-primary/40">
          <CardHeader>
            <CardTitle>{program.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{program.summary}</p>
            <Badge variant="outline">{program.access}</Badge>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onManage(program)}>
                Manage
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAssign(program)}>
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
