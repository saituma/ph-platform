"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function ParentProgressPage() {
  return (
    <ParentShell
      title="Progress"
      subtitle="Track your athlete’s weekly improvements."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Training Load</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Weekly load is steady with a +8% trend.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coach Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Focus on acceleration mechanics and recovery sleep.
          </CardContent>
        </Card>
      </div>
    </ParentShell>
  );
}
