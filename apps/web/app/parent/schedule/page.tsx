"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function ParentSchedulePage() {
  return (
    <ParentShell
      title="Schedule"
      subtitle="Upcoming sessions and availability."
      actions={<Button>Book Session</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
            Friday • 17:00 • Live Performance Session
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
            Monday • 18:30 • Video Feedback Review
          </div>
        </CardContent>
      </Card>
    </ParentShell>
  );
}
