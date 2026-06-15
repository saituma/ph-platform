import Link from "next/link";
import { Button } from "../../ui/button";
import { Card, CardHeader, CardTitle, CardPanel } from "../../ui/card";
import { Empty, EmptyTitle, EmptyDescription } from "../../ui/empty";
import { Skeleton } from "../../ui/skeleton";

type ProgramItem = {
  id: number;
  name: string;
  summary?: string | null;
  type: string;
  minAge?: number | null;
  maxAge?: number | null;
  href?: string;
  isPreseason?: boolean;
  isCreatePlaceholder?: boolean;
};

type ProgramsGridProps = {
  programs: ProgramItem[];
  isLoading?: boolean;
  onManage: (program: ProgramItem) => void;
  onAssign: (program: ProgramItem) => void;
  onCreatePreseason?: () => void;
  isCreatingPreseason?: boolean;
  highlightedProgramId?: number | null;
};

export function ProgramsGrid({
  programs,
  isLoading = false,
  onManage,
  onAssign,
  onCreatePreseason,
  isCreatingPreseason = false,
  highlightedProgramId = null,
}: ProgramsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`program-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardPanel className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No programs yet</EmptyTitle>
        <EmptyDescription>Create your first training program.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {programs.map((program) => (
        <Card
          key={program.id}
          className={
            highlightedProgramId === program.id
              ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
              : "hover:border-primary/40"
          }
        >
          <CardHeader>
            <CardTitle>{program.name}</CardTitle>
          </CardHeader>
          <CardPanel className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {program.summary || "No description yet."}
            </p>
            <div className="flex gap-2">
              {program.isCreatePlaceholder ? (
                <Button size="sm" onClick={onCreatePreseason} disabled={isCreatingPreseason}>
                  {isCreatingPreseason ? "Creating..." : "Create"}
                </Button>
              ) : (
                <Link href={program.href ?? `/programs/${program.id}`}>
                  <Button size="sm">Open</Button>
                </Link>
              )}
              {!program.isPreseason && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onManage(program)}>
                    Manage
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onAssign(program)}>
                    Assign
                  </Button>
                </>
              )}
            </div>
          </CardPanel>
        </Card>
      ))}
    </div>
  );
}
