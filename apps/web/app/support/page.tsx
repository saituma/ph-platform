"use client";

import Link from "next/link";

import { AdminShell } from "../../components/admin/shell";
import { AppFeedbackPanel } from "../../components/support/app-feedback-panel";
import { Button } from "../../components/ui/button";

export default function AdminSupportPage() {
  return (
    <AdminShell
      title="Support & feedback"
      subtitle="Send product issues, ideas, and account questions to the coaching team. Messages appear in Messaging with an [App feedback — …] prefix."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Button variant="outline" render={<Link href="/messaging" />}>
          Open Messaging
        </Button>
      </div>
      <AppFeedbackPanel variant="admin" className="max-w-2xl" />
    </AdminShell>
  );
}
