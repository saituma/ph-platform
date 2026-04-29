"use client";

import { AdminShell } from "../../components/admin/shell";
import { PortalConfigEditor } from "../../components/admin/settings/portal-config-editor";

export default function PortalConfigPage() {
  return (
    <AdminShell
      title="Portal configuration"
      subtitle="Edit the marketing copy shown on the public landing page — hero, features, testimonials, CTA, and footer."
    >
      <PortalConfigEditor />
    </AdminShell>
  );
}
