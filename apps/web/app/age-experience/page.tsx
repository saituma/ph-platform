"use client";

import { AdminShell } from "../../components/admin/shell";
import { AgeExperienceCard } from "../../components/admin/age-experience/age-experience-card";

export default function AgeExperiencePage() {
  return (
    <AdminShell
      title="Age experience"
      subtitle="Rules match athletes by age. Each rule’s title appears on the mobile app under More → Experience; presets control density, type scale, and hidden tabs."
    >
      <AgeExperienceCard />
    </AdminShell>
  );
}
