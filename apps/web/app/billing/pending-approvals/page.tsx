import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PendingApprovalsManager } from "../../../components/admin/billing/pending-approvals-manager";
import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";

export default function BillingPendingApprovalsPage() {
  return (
    <AdminShell
      title="Pending Approvals"
      subtitle="Review subscription change requests before access updates go live."
      actions={
        <Button render={<Link href="/billing" />} variant="outline">
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Button>
      }
    >
      <PendingApprovalsManager />
    </AdminShell>
  );
}
