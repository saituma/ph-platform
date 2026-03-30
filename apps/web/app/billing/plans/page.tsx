import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PlansManager } from "../../../components/admin/billing/plans-manager";
import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";

export default function BillingPlansPage() {
  return (
    <AdminShell
      title="Subscription Plans"
      subtitle="Dynamic plan setup used by billing and tier-aware experiences."
      actions={
        <Button asChild variant="outline">
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </Link>
        </Button>
      }
    >
      <PlansManager />
    </AdminShell>
  );
}
