"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Plus } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import {
  useGetPreseasonProgrammesQuery,
  useCreatePreseasonProgrammeMutation,
} from "../../../lib/apiSlice";
import { toast } from "@/lib/toast";

export default function PreseasonPage() {
  const router = useRouter();
  const { data, isLoading } = useGetPreseasonProgrammesQuery();
  const [createProgramme, { isLoading: isCreating }] = useCreatePreseasonProgrammeMutation();

  const programmes = data?.programmes ?? [];

  // Auto-redirect to the programme if one exists
  useEffect(() => {
    if (!isLoading && programmes.length > 0) {
      router.replace(`/programs/preseason/${programmes[0].id}`);
    }
  }, [isLoading, programmes, router]);

  async function handleCreate() {
    try {
      const result = await createProgramme({
        title: "Pre-Season Programme",
        weekCount: 6,
        athleteType: "adult",
      }).unwrap();
      toast.success("Programme created");
      router.push(`/programs/preseason/${result.programme.id}`);
    } catch {
      toast.error("Failed to create programme");
    }
  }

  // Show loading while checking or redirecting
  if (isLoading || programmes.length > 0) {
    return (
      <AdminShell title="Pre-Season" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  // No programme exists - show create button
  return (
    <AdminShell title="Pre-Season Programme" subtitle="Build your pre-season training block.">
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <CalendarRange className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="font-semibold text-foreground">No Pre-Season programme yet</p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Create your programme to start building weeks and sessions.
        </p>
        <Button onClick={handleCreate} disabled={isCreating}>
          <Plus className="mr-1.5 h-4 w-4" />
          {isCreating ? "Creating..." : "Create Programme"}
        </Button>
      </div>
    </AdminShell>
  );
}
