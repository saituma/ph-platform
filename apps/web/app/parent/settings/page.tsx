"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function ParentSettingsPage() {
  return (
    <ParentShell
      title="Settings"
      subtitle="Update notifications and preferences."
      actions={<Button variant="outline">Save Settings</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
            Email notifications enabled
          </div>
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
            SMS alerts disabled
          </div>
        </CardContent>
      </Card>
    </ParentShell>
  );
}
