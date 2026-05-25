import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { LaunchPromoManager } from "../../../components/admin/billing/launch-promo-manager";

export default function LaunchPromoPage() {
  return (
    <AdminShell
      title="Launch Discount Codes"
      subtitle="Generate one-time promo codes for existing clients and send them their personal discount link."
      actions={
        <Button render={<Link href="/billing" />} variant="outline">
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Button>
      }
    >
      <LaunchPromoManager />
    </AdminShell>
  );
}
