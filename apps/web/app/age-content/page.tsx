"use client";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ParentContentCard } from "../../components/parent/config/parent-content-card";
import { ParentCoursesCard } from "../../components/parent/config/parent-courses-card";

export default function AgeContentControlPage() {
  return (
    <AdminShell title="Age Content Control" subtitle="Control what content appears by athlete age.">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How Age Filters Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Set minimum and maximum age to target content to specific age groups.</p>
          <p>Leave age fields blank to make content available to all ages.</p>
          <p>Content updates automatically on the athlete&apos;s birthday.</p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <ParentContentCard />
        <ParentCoursesCard />
      </div>
    </AdminShell>
  );
}
