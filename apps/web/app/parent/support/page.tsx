"use client";

import Link from "next/link";

import { ParentShell } from "../../../components/parent/shell";
import { AppFeedbackPanel } from "../../../components/support/app-feedback-panel";
import { Button } from "../../../components/ui/button";

export default function ParentSupportPage() {
  return (
    <ParentShell
      title="Support & feedback"
      subtitle="Tell the team about bugs, billing questions, or scheduling—same channel as the mobile app."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/parent/messages">Open Messages</Link>
        </Button>
      </div>
      <AppFeedbackPanel variant="parent" className="max-w-2xl" />
    </ParentShell>
  );
}
