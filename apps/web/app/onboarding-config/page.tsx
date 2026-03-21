"use client";

import { AdminShell } from "../../components/admin/shell";
import { OnboardingConfigEditor } from "../../components/admin/settings/onboarding-config-editor";

export default function OnboardingConfigPage() {
  return (
    <AdminShell
      title="Onboarding configuration"
      subtitle="Control mobile signup fields, team and level options, documents, and defaults."
    >
      <OnboardingConfigEditor />
    </AdminShell>
  );
}
