"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function ParentAthletePage() {
  return (
    <ParentShell
      title="Athlete Profile"
      subtitle="Keep athlete details up to date."
      actions={<Button variant="outline">Edit Profile</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Name: Dawit</p>
            <p>Age: 15</p>
            <p>Team: PH Academy</p>
            <p>Training Days: 4 per week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Health Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Injuries: None reported</p>
            <p>Growth Notes: Focus on mobility</p>
          </CardContent>
        </Card>
      </div>
    </ParentShell>
  );
}
