import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TeamPaymentsManager } from "../../../components/admin/billing/team-payments-manager";
import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";

export default function TeamPaymentsPage() {
  return (
    <AdminShell
      title="Team Payments"
      subtitle="View team payment modes, monitor invites, and see payment status."
      actions={
        <Button render={<Link href="/billing" />} variant="outline">
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Button>
      }
    >
      <TeamPaymentsManager />
    </AdminShell>
  );
}
