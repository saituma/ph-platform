"use client";

import { ParentShell } from "../../../components/parent/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

export default function ParentOnboardingPage() {
  return (
    <ParentShell
      title="Onboarding"
      subtitle="Manage athlete onboarding and documents."
      actions={<Button>Submit Updates</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Athlete Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Complete the profile to unlock personalized training.</p>
            <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-foreground">
              Medical history, training days, and equipment access required.
            </div>
            <Button variant="outline">Edit Profile</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guardian Consent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Consent forms are mandatory before sessions begin.</p>
            <Button variant="outline">Review & Sign</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Upload injury reports or medical clearance documents.</p>
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-muted-foreground">
            Drag & drop files here or click upload.
          </div>
          <Button variant="outline">Upload Files</Button>
        </CardContent>
      </Card>
    </ParentShell>
  );
}
