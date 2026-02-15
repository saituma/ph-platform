"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function ParentMessagesPage() {
  return (
    <ParentShell
      title="Messages"
      subtitle="Stay connected with your coach."
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
            Coach Mike • “Great work this week. Let’s review the next steps.”
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
            Support Team • “Your plan has been updated with new drills.”
          </div>
        </CardContent>
      </Card>
    </ParentShell>
  );
}
