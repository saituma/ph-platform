"use client";

import { useEffect, useMemo, useState } from "react";

import { ParentShell } from "../../components/parent/shell";
import { cn } from "../../lib/utils";
import {
  useGetOnboardingConfigQuery,
  useGetUserOnboardingQuery,
  useGetUsersQuery,
  useUpdateOnboardingConfigMutation,
} from "../../lib/apiSlice";
import { CompletedOnboardingCard } from "../../components/parent/config/completed-onboarding-card";
import { FormFieldsCard } from "../../components/parent/config/form-fields-card";
import { MessagesCard } from "../../components/parent/config/messages-card";
import { PublishBar } from "../../components/parent/config/publish-bar";
import { TeamLevelsDialog } from "../../components/parent/config/team-levels-dialog";
import { documentRequirements, FieldConfig, FieldType, initialFields, DocumentConfig } from "../../components/parent/config/types";
import { ParentCoursesCard } from "../../components/parent/config/parent-courses-card";
import { CollapsibleSection } from "../../components/parent/config/collapsible-section";
import { BillingSection } from "../../components/parent/config/billing-section";

export default function ParentDashboardPage() {
  const { data } = useGetOnboardingConfigQuery();
  const { data: usersData } = useGetUsersQuery();
  const [updateConfig, { isLoading: isSaving }] = useUpdateOnboardingConfigMutation();

  const [fields, setFields] = useState<FieldConfig[]>(initialFields);
  const [docs, setDocs] = useState<DocumentConfig[]>(documentRequirements);
  const [defaultProgramTier, setDefaultProgramTier] = useState("PHP");
  const [approvalWorkflow, setApprovalWorkflow] = useState("manual");
  const [notes, setNotes] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [coachMessage, setCoachMessage] = useState("");

  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldType>("text");
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldOption, setNewFieldOption] = useState("");
  const [newTeamOption, setNewTeamOption] = useState("");
  const [editTeamOption, setEditTeamOption] = useState<string | null>(null);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newLevelOption, setNewLevelOption] = useState("");
  const [editLevelOption, setEditLevelOption] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("form-fields");

  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { data: onboardingData } = useGetUserOnboardingQuery(selectedUserId ?? 0, { skip: !selectedUserId });

  const completedGuardians = useMemo(() => {
    const users = usersData?.users ?? [];
    return users.filter((user) => user.onboardingCompleted);
  }, [usersData]);

  const selectedGuardian = completedGuardians.find((user) => user.id === selectedUserId);
  const extraResponses = onboardingData?.athlete?.extraResponses ?? {};
  const extraLevel =
    typeof extraResponses === "object" && extraResponses !== null
      ? (extraResponses as Record<string, unknown>)["level"] as string | null
      : null;
  const extraEntries =
    typeof extraResponses === "object" && extraResponses !== null
      ? Object.entries(extraResponses as Record<string, unknown>)
          .filter(([key]) => key !== "level")
          .map(([key, value]) => `${key}: ${String(value)}`)
      : [];

  const updateFields = (updater: (prev: FieldConfig[]) => FieldConfig[]) => {
    setFields((prev) => updater(prev));
  };

  const upsertField = (payload: FieldConfig) => {
    setFields((prev) => {
      const existing = prev.find((item) => item.id === payload.id);
      if (!existing) return [...prev, payload];
      return prev.map((item) => (item.id === payload.id ? { ...item, ...payload } : item));
    });
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    const id = `${newFieldLabel.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const options = newFieldType === "dropdown" && newFieldOption.trim() ? [newFieldOption.trim()] : undefined;

    setFields((prev) => [
      ...prev,
      {
        id,
        label: newFieldLabel.trim(),
        type: newFieldType,
        required: newFieldRequired,
        visible: true,
        options,
      },
    ]);

    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(true);
    setNewFieldOption("");
  };

  const handleAddTeamLevel = () => {
    upsertField({
      id: "team",
      label: "Team",
      type: "dropdown",
      required: true,
      visible: true,
      options: ["Team A", "Team B", "Team C"],
    });

    if (!fields.some((field) => field.id === "level")) {
      upsertField({
        id: "level",
        label: "Level",
        type: "dropdown",
        required: true,
        visible: true,
        options: ["U12", "U14", "U16", "U18"],
        optionsByTeam: {
          "Team A": ["U12", "U14"],
          "Team B": ["U16", "U18"],
          "Team C": ["U12"],
        },
      });
    }
  };

  const handleOpenTeamModal = () => {
    updateFields((prev) => {
      const teamOptions = prev.find((item) => item.id === "team")?.options ?? [];
      const hasLevel = prev.some((item) => item.id === "level");
      if (!hasLevel) {
        return [
          ...prev,
          {
            id: "level",
            label: "Level",
            type: "dropdown",
            required: true,
            visible: true,
            options: [],
            optionsByTeam: {},
          },
        ];
      }
      return prev.map((item) => {
        if (item.id !== "level") return item;
        const current = item.optionsByTeam ?? {};
        if (Object.keys(current).length || !teamOptions.length) return item;
        const fallback = item.options ?? [];
        const seeded = teamOptions.reduce<Record<string, string[]>>((acc, team) => ({ ...acc, [team]: fallback }), {});
        return { ...item, optionsByTeam: seeded };
      });
    });

    const teamOptions = fields.find((item) => item.id === "team")?.options ?? [];
    setSelectedTeam(teamOptions[0] ?? null);
    setIsTeamModalOpen(true);
  };

  useEffect(() => {
    if (!data?.config) return;
    const config = data.config as Record<string, unknown>;
    const rawFields = Array.isArray(config.fields) ? config.fields : initialFields;
    const hasBirthDate = rawFields.some((field: any) => field?.id === "birthDate");
    const normalizedFields: FieldConfig[] = rawFields.map((field) => {
      const item = field as Partial<FieldConfig>;
      const normalizedId = item.id === "age" && !hasBirthDate ? "birthDate" : item.id;
      return {
        id: normalizedId ?? `field-${Date.now()}`,
        label: item.id === "age" && !hasBirthDate ? "Birth Date" : item.label ?? "Field",
        type: (item.id === "age" && !hasBirthDate ? "date" : (item.type as FieldType)) ?? "text",
        required: Boolean(item.required),
        visible: item.visible !== false,
        options: item.options ?? undefined,
        optionsByTeam: item.optionsByTeam ?? undefined,
      };
    });
    setFields(normalizedFields);

    const rawDocs = Array.isArray(config.requiredDocuments)
      ? config.requiredDocuments
      : documentRequirements;
    const normalizedDocs: DocumentConfig[] = rawDocs.map((doc) => {
      const item = doc as Partial<DocumentConfig>;
      return {
        id: item.id ?? `doc-${Date.now()}`,
        label: item.label ?? "Document",
        required: Boolean(item.required),
      };
    });
    setDocs(normalizedDocs);

    setDefaultProgramTier(String(config.defaultProgramTier ?? "PHP"));
    setApprovalWorkflow(String(config.approvalWorkflow ?? "manual"));
    setNotes(String(config.notes ?? ""));
    setWelcomeMessage(String(config.welcomeMessage ?? ""));
    setCoachMessage(String(config.coachMessage ?? ""));
  }, [data]);

  const handleSave = async () => {
    const hasTeam = fields.some((field) => field.id === "team");
    const hasLevel = fields.some((field) => field.id === "level");
    const normalizedFields = [
      ...fields.map((field) =>
        field.id === "level" ? { ...field, optionsByTeam: field.optionsByTeam ?? {} } : field
      ),
      ...(hasTeam && !hasLevel
        ? [{ id: "level", label: "Level", type: "dropdown" as FieldType, required: true, visible: true, options: ["U12", "U14", "U16", "U18"], optionsByTeam: {} }]
        : []),
    ].map((field) => ({ ...field, visible: field.visible }));

    const normalizedDocs = docs.map((doc) => ({ ...doc, required: doc.required }));

    try {
      await updateConfig({
        version: 1,
        fields: normalizedFields,
        requiredDocuments: normalizedDocs,
        welcomeMessage,
        coachMessage,
        defaultProgramTier,
        approvalWorkflow,
        notes,
      }).unwrap();
      setSaveStatus({ type: "success", message: "Onboarding configuration saved." });
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
      setSaveStatus({ type: "error", message: message || "Failed to save configuration." });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <ParentShell title="Parent Portal Configuration" subtitle="Admin control for parent onboarding and settings.">
      {saveStatus ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            saveStatus.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          )}
        >
          {saveStatus.message}
        </div>
      ) : null}

      <div className="space-y-4">
        <CollapsibleSection id="form-fields" title="Onboarding Form Fields" openSection={openSection} onToggle={setOpenSection}>
          <div className="space-y-6">
            <FormFieldsCard
              fields={fields}
              newFieldLabel={newFieldLabel}
              newFieldType={newFieldType}
              newFieldRequired={newFieldRequired}
              newFieldOption={newFieldOption}
              newTeamOption={newTeamOption}
              editTeamOption={editTeamOption}
              selectedTeam={selectedTeam}
              onSetNewFieldLabel={setNewFieldLabel}
              onSetNewFieldType={setNewFieldType}
              onSetNewFieldRequired={setNewFieldRequired}
              onSetNewFieldOption={setNewFieldOption}
              onSetNewTeamOption={setNewTeamOption}
              onSetEditTeamOption={setEditTeamOption}
              onSetSelectedTeam={setSelectedTeam}
              onUpdateFields={updateFields}
              onHandleAddField={handleAddField}
              onHandleAddTeamLevel={handleAddTeamLevel}
              onOpenTeamModal={handleOpenTeamModal}
            />
            <MessagesCard
              welcomeMessage={welcomeMessage}
              coachMessage={coachMessage}
              onSetWelcomeMessage={setWelcomeMessage}
              onSetCoachMessage={setCoachMessage}
            />
            <PublishBar isSaving={isSaving} onPublish={handleSave} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection id="parent-content" title="Parent Education Content" openSection={openSection} onToggle={setOpenSection}>
          <ParentCoursesCard />
        </CollapsibleSection>

        <CollapsibleSection id="billing" title="Billing" openSection={openSection} onToggle={setOpenSection}>
          <BillingSection />
        </CollapsibleSection>

        <CollapsibleSection id="completed" title="Completed Onboarding" openSection={openSection} onToggle={setOpenSection}>
          <CompletedOnboardingCard
            completedGuardians={completedGuardians}
            selectedUserId={selectedUserId}
            selectedGuardian={selectedGuardian}
            onboardingData={onboardingData}
            extraLevel={extraLevel}
            extraEntries={extraEntries}
            onSelectUser={setSelectedUserId}
          />
        </CollapsibleSection>
      </div>

      <TeamLevelsDialog
        open={isTeamModalOpen}
        fields={fields}
        selectedTeam={selectedTeam}
        editLevelOption={editLevelOption}
        newLevelOption={newLevelOption}
        onOpenChange={setIsTeamModalOpen}
        onSetSelectedTeam={setSelectedTeam}
        onSetEditLevelOption={setEditLevelOption}
        onSetNewLevelOption={setNewLevelOption}
        onUpdateFields={updateFields}
      />
    </ParentShell>
  );
}
