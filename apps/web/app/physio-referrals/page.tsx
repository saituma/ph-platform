"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  useGetAdminTeamsQuery,
  useCreateBulkPhysioReferralMutation,
  useCreateMediaUploadUrlMutation,
  useCreateReferralGroupMutation,
  useCreatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetPhysioReferralsQuery,
  useGetReferralGroupsQuery,
  useGetUsersQuery,
  useUpdatePhysioReferralMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type TargetMode = "single" | "team" | "age_range" | "group";
type AgeMode = "single_age" | "range_age";

type ReferralMetadata = {
  referralType?: string | null;
  assignmentMode?: TargetMode | null;
  targetLabel?: string | null;
  targetGroupKey?: string | null;
  targetTeam?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  providerName?: string | null;
  organizationName?: string | null;
  imageUrl?: string | null;
  physioName?: string | null;
  clinicName?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  specialty?: string | null;
  notes?: string | null;
};

type ReferralItem = {
  id: number;
  athleteId: number;
  athleteName?: string | null;
  programTier?: string | null;
  referalLink?: string | null;
  discountPercent?: number | null;
  metadata?: ReferralMetadata | null;
  createdAt?: string | null;
};

type AthleteOption = {
  athleteId: number;
  athleteAge?: number | null;
  tier: string;
  team: string;
  label: string;
};

type ReferralUser = {
  athleteId?: number | null;
  athleteAge?: number | null;
  athleteName?: string | null;
  team?: string | null;
  programTier?: string | null;
  guardianProgramTier?: string | null;
  currentProgramTier?: string | null;
};

type ReferralGroup = {
  id: number;
  name: string;
  expectedSize: number;
  members: {
    athleteId: number;
    athleteName?: string | null;
    athleteAge?: number | null;
    programTier?: string | null;
  }[];
};

const REFERRAL_TYPE_OPTIONS = ["Physio", "Stocks", "Nutrition", "Recovery", "Doctor", "Specialist", "Other"];
const PRESET_REFERRAL_TYPES = new Set(REFERRAL_TYPE_OPTIONS.filter((option) => option !== "Other"));

function resolveReferralType(metadata?: ReferralMetadata | null) {
  const explicitType = metadata?.referralType?.trim();
  if (explicitType) return explicitType;
  if (metadata?.physioName || metadata?.clinicName) return "Physio";
  return "General";
}

function resolveProviderName(metadata?: ReferralMetadata | null) {
  return metadata?.providerName?.trim() || metadata?.physioName?.trim() || "";
}

function resolveOrganizationName(metadata?: ReferralMetadata | null) {
  return metadata?.organizationName?.trim() || metadata?.clinicName?.trim() || "";
}

function getTypeSelection(typeLabel: string) {
  if (PRESET_REFERRAL_TYPES.has(typeLabel)) {
    return { selectValue: typeLabel, customValue: "" };
  }
  return { selectValue: "Other", customValue: typeLabel === "General" ? "" : typeLabel };
}

function getResolvedReferralType(selectedType: string, customType: string) {
  return (selectedType === "Other" ? customType : selectedType).trim();
}

function getTargetLabel(
  mode: TargetMode,
  options: { teamName?: string; minAge?: string; maxAge?: string; groupName?: string }
) {
  if (mode === "team") {
    return options.teamName?.trim() ? `Team ${options.teamName.trim()}` : "Team";
  }
  if (mode === "age_range") {
    if (options.minAge && options.maxAge && options.minAge === options.maxAge) {
      return `Age ${options.minAge}`;
    }
    return `Ages ${options.minAge}-${options.maxAge}`;
  }
  if (mode === "group") return options.groupName?.trim() || "Referral group";
  return "Individual athlete";
}

function getErrorMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function ReferralsPage() {
  const searchParams = useSearchParams();
  const { data, isLoading } = useGetPhysioReferralsQuery();
  const { data: referralGroupsData } = useGetReferralGroupsQuery();
  const { data: teamsData } = useGetAdminTeamsQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createReferral, { isLoading: creating }] = useCreatePhysioReferralMutation();
  const [createBulkReferral, { isLoading: creatingBulk }] = useCreateBulkPhysioReferralMutation();
  const [createUploadUrl] = useCreateMediaUploadUrlMutation();
  const [createReferralGroup, { isLoading: creatingGroup }] = useCreateReferralGroupMutation();
  const [updateReferral] = useUpdatePhysioReferralMutation();
  const [deleteReferral] = useDeletePhysioReferralMutation();

  const [activeTab, setActiveTab] = useState("create");
  const [targetMode, setTargetMode] = useState<TargetMode>("single");
  const [athleteId, setAthleteId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteLabel, setAthleteLabel] = useState<string | null>(null);
  const [ageMode, setAgeMode] = useState<AgeMode>("single_age");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupSize, setGroupSize] = useState("");
  const [groupAthleteSearch, setGroupAthleteSearch] = useState("");
  const [groupAthleteIds, setGroupAthleteIds] = useState<number[]>([]);
  const [referralType, setReferralType] = useState("Physio");
  const [customReferralType, setCustomReferralType] = useState("");
  const [referalLink, setReferalLink] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [emailField, setEmailField] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<number | null>(null);
  const [editReferralType, setEditReferralType] = useState("Physio");
  const [editCustomReferralType, setEditCustomReferralType] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editProviderName, setEditProviderName] = useState("");
  const [editOrganizationName, setEditOrganizationName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const entries: ReferralItem[] = useMemo(() => data?.items ?? [], [data]);
  const referralGroups: ReferralGroup[] = useMemo(() => referralGroupsData?.items ?? [], [referralGroupsData]);

  const athleteOptions = useMemo(() => {
    const users = (usersData?.users ?? []) as ReferralUser[];
    return users
      .filter((user) => user.athleteId)
      .map((user) => {
        const tier = (user.programTier ?? user.guardianProgramTier ?? user.currentProgramTier ?? null) as string | null;
        const team = String(user.team ?? "").trim();
        const athleteName = String(user.athleteName ?? "Athlete").trim() || "Athlete";
        return {
          athleteId: Number(user.athleteId),
          athleteAge: typeof user.athleteAge === "number" ? user.athleteAge : null,
          tier: tier ?? "",
          team: team || "Unknown",
          label: `${athleteName} • ${tier ?? "PHP"} • ${team || "Unknown"}`,
        } satisfies AthleteOption;
      });
  }, [usersData]);

  const athleteTierById = useMemo(() => {
    const map = new Map<number, string>();
    athleteOptions.forEach((option) => {
      if (option.tier) map.set(option.athleteId, option.tier);
    });
    return map;
  }, [athleteOptions]);

  const selectedAthleteTier = useMemo(() => {
    const id = Number(athleteId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return athleteTierById.get(id) ?? null;
  }, [athleteId, athleteTierById]);

  const teamOptions = useMemo(() => {
    const fromApi = (teamsData?.teams ?? [])
      .map((item) => String(item?.team ?? "").trim())
      .filter((item) => item.length > 0);
    const fromAthletes = athleteOptions
      .map((option) => option.team)
      .filter((item) => item.length > 0);
    return Array.from(new Set([...fromApi, ...fromAthletes])).sort((a, b) => a.localeCompare(b));
  }, [athleteOptions, teamsData]);

  const filteredAthletes = useMemo(() => {
    if (targetMode !== "single" || athleteId) return [];
    if (!athleteSearch.trim()) return athleteOptions.slice(0, 6);
    const needle = athleteSearch.trim().toLowerCase();
    return athleteOptions.filter((option) => option.label.toLowerCase().includes(needle)).slice(0, 6);
  }, [athleteId, athleteOptions, athleteSearch, targetMode]);

  const selectedReferralGroup = useMemo(
    () => referralGroups.find((group) => group.id === Number(groupId)) ?? null,
    [groupId, referralGroups]
  );

  const filteredGroupAthletes = useMemo(() => {
    const selected = new Set(groupAthleteIds);
    const available = athleteOptions.filter((option) => !selected.has(option.athleteId));
    if (!groupAthleteSearch.trim()) return available.slice(0, 6);
    const needle = groupAthleteSearch.trim().toLowerCase();
    return available.filter((option) => option.label.toLowerCase().includes(needle)).slice(0, 6);
  }, [athleteOptions, groupAthleteIds, groupAthleteSearch]);

  const targetedAthletes = useMemo(() => {
    if (targetMode === "single") {
      return athleteId ? athleteOptions.filter((option) => option.athleteId === Number(athleteId)) : [];
    }
    if (targetMode === "team") {
      if (!teamName.trim()) return [];
      return athleteOptions.filter((option) => option.team === teamName.trim());
    }
    if (targetMode === "age_range") {
      const parsedMin = Number(minAge);
      const parsedMax = Number(ageMode === "single_age" ? minAge : maxAge);
      if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || parsedMin > parsedMax) return [];
      return athleteOptions.filter((option) => {
        const age = option.athleteAge;
        return typeof age === "number" && age >= parsedMin && age <= parsedMax;
      });
    }
    return (selectedReferralGroup?.members ?? [])
      .map((member) => ({
        athleteId: member.athleteId,
        athleteAge: member.athleteAge ?? null,
        tier: member.programTier ?? "",
        team: "Unknown",
        label: member.athleteName ?? `Athlete #${member.athleteId}`,
      }));
  }, [ageMode, athleteId, athleteOptions, maxAge, minAge, selectedReferralGroup, targetMode, teamName]);

  const eligibleEntries = entries;

  const resetCreateForm = () => {
    setTargetMode("single");
    setAthleteId("");
    setTeamName("");
    setAthleteSearch("");
    setAthleteLabel(null);
    setAgeMode("single_age");
    setMinAge("");
    setMaxAge("");
    setGroupId("");
    setReferralType("Physio");
    setCustomReferralType("");
    setReferalLink("");
    setDiscountPercent("");
    setProviderName("");
    setOrganizationName("");
    setImageUrl("");
    setLocation("");
    setPhone("");
    setEmailField("");
    setSpecialty("");
    setNotes("");
  };

  const buildMetadata = (): ReferralMetadata | null => {
    const resolvedType = getResolvedReferralType(referralType, customReferralType);
    const meta: ReferralMetadata = {
      assignmentMode: targetMode,
      targetLabel: getTargetLabel(targetMode, {
        teamName,
        minAge,
        maxAge: targetMode === "age_range" && ageMode === "single_age" ? minAge : maxAge,
        groupName: selectedReferralGroup?.name,
      }),
      targetGroupKey: targetMode === "group" ? groupId : null,
      targetTeam: targetMode === "team" ? teamName.trim() || null : null,
      minAge: targetMode === "age_range" && minAge ? Number(minAge) : null,
      maxAge:
        targetMode === "age_range" && (ageMode === "single_age" ? minAge : maxAge)
          ? Number(ageMode === "single_age" ? minAge : maxAge)
          : null,
    };
    if (resolvedType) meta.referralType = resolvedType;
    if (providerName.trim()) meta.providerName = providerName.trim();
    if (organizationName.trim()) meta.organizationName = organizationName.trim();
    if (imageUrl.trim()) meta.imageUrl = imageUrl.trim();
    if (location.trim()) meta.location = location.trim();
    if (phone.trim()) meta.phone = phone.trim();
    if (emailField.trim()) meta.email = emailField.trim();
    if (specialty.trim()) meta.specialty = specialty.trim();
    if (notes.trim()) meta.notes = notes.trim();
    return meta;
  };

  const buildEditMetadata = (): ReferralMetadata | null => {
    const resolvedType = getResolvedReferralType(editReferralType, editCustomReferralType);
    const meta: ReferralMetadata = {};
    if (resolvedType) meta.referralType = resolvedType;
    if (editProviderName.trim()) meta.providerName = editProviderName.trim();
    if (editOrganizationName.trim()) meta.organizationName = editOrganizationName.trim();
    if (editImageUrl.trim()) meta.imageUrl = editImageUrl.trim();
    if (editLocation.trim()) meta.location = editLocation.trim();
    if (editPhone.trim()) meta.phone = editPhone.trim();
    if (editEmail.trim()) meta.email = editEmail.trim();
    if (editSpecialty.trim()) meta.specialty = editSpecialty.trim();
    if (editNotes.trim()) meta.notes = editNotes.trim();
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const handleCreateGroup = async () => {
    setError(null);
    const normalizedName = groupName.trim();
    const expectedSize = Number(groupSize);
    const uniqueAthleteIds = Array.from(new Set(groupAthleteIds));
    if (!normalizedName) {
      setError("Group name is required.");
      return;
    }
    if (!Number.isFinite(expectedSize) || expectedSize <= 0) {
      setError("Group size must be greater than zero.");
      return;
    }
    if (uniqueAthleteIds.length !== expectedSize) {
      setError("Group size must match the number of athletes added.");
      return;
    }
    try {
      const result = await createReferralGroup({
        name: normalizedName,
        expectedSize,
        athleteIds: uniqueAthleteIds,
      }).unwrap();
      setGroupId(String(result.item.id));
      setGroupName("");
      setGroupSize("");
      setGroupAthleteSearch("");
      setGroupAthleteIds([]);
      toast.success("Referral group saved", "You can reuse this group for future referrals.");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Please try again.");
      setError(message);
      toast.error("Failed to save group", message);
    }
  };

  const uploadReferralImage = async (
    file: File,
    onSuccess: (url: string) => void,
    setUploading: (value: boolean) => void
  ) => {
    try {
      setUploading(true);
	      const { uploadUrl, publicUrl } = await createUploadUrl({
	        folder: "referrals",
	        fileName: `${Date.now()}-${file.name}`,
	        contentType: file.type || "application/octet-stream",
	        sizeBytes: file.size,
	        client: "web",
	      }).unwrap();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      onSuccess(publicUrl);
      toast.success("Image uploaded", "The referral image is ready.");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Please try again.");
      setError(message);
      toast.error("Upload failed", message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    const resolvedType = getResolvedReferralType(referralType, customReferralType);
    if (!resolvedType) {
      setError("Referral type is required.");
      return;
    }
    if (!referalLink) {
      setError("Referral link is required.");
      return;
    }
    if (targetMode === "single" && !athleteId) {
      setError("Choose an athlete for single-athlete referrals.");
      return;
    }
    if (targetMode === "team" && !teamName.trim()) {
      setError("Choose a team.");
      return;
    }
    if (targetMode === "age_range") {
      const parsedMin = Number(minAge);
      const parsedMax = Number(ageMode === "single_age" ? minAge : maxAge);
      if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax) || parsedMin > parsedMax) {
        setError("Enter a valid age range.");
        return;
      }
    }
    if (targetMode === "group" && !selectedReferralGroup) {
      setError("Choose a saved referral group.");
      return;
    }
    if (targetedAthletes.length === 0) {
      setError("No athletes match that target.");
      return;
    }

    try {
      if (targetMode === "single") {
        await createReferral({
          athleteId: Number(athleteId),
          programTier: selectedAthleteTier,
          referalLink,
          discountPercent: discountPercent ? Number(discountPercent) : undefined,
          metadata: buildMetadata(),
        }).unwrap();
        toast.success("Referral saved", "The athlete now has a referral and will be notified.");
      } else {
        const result = await createBulkReferral({
          targeting:
            targetMode === "team"
              ? {
                  mode: "team",
                  team: teamName.trim(),
                }
              : targetMode === "age_range"
              ? {
                  mode: "age_range",
                  minAge: Number(minAge),
                  maxAge: Number(ageMode === "single_age" ? minAge : maxAge),
                }
              : { mode: "group", groupId: Number(groupId) },
          referalLink,
          discountPercent: discountPercent ? Number(discountPercent) : undefined,
          metadata: buildMetadata(),
        }).unwrap();
        toast.success(
          "Referrals saved",
          `${result.summary.createdCount} referral${result.summary.createdCount === 1 ? "" : "s"} created${result.summary.skippedCount ? `, ${result.summary.skippedCount} skipped` : ""}.`
        );
      }
      resetCreateForm();
      setActiveTab("existing");
    } catch (err: unknown) {
      if (
        (typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status?: number }).status === 409) ||
        getErrorMessage(err, "") === "Referral already exists for this athlete" ||
        getErrorMessage(err, "") === "A referral of this type already exists for this athlete"
      ) {
        setError("A matching referral type already exists for one or more selected athletes.");
        toast.warning("Referral already exists", "Edit the existing referral instead.");
        return;
      }
      const message = getErrorMessage(err, "Please try again.");
      setError(message);
      toast.error("Failed to create referral", message);
    }
  };

  const startEdit = (entry: ReferralItem) => {
    const meta = (entry.metadata ?? {}) as ReferralMetadata;
    const resolvedType = resolveReferralType(meta);
    const typeSelection = getTypeSelection(resolvedType);
    setEditingId(entry.id);
    setEditReferralType(typeSelection.selectValue);
    setEditCustomReferralType(typeSelection.customValue);
    setEditLink(entry.referalLink ?? "");
    setEditDiscount(typeof entry.discountPercent === "number" ? String(entry.discountPercent) : "");
    setEditProviderName(resolveProviderName(meta));
    setEditOrganizationName(resolveOrganizationName(meta));
    setEditImageUrl(meta.imageUrl ?? "");
    setEditLocation(meta.location ?? "");
    setEditPhone(meta.phone ?? "");
    setEditEmail(meta.email ?? "");
    setEditSpecialty(meta.specialty ?? "");
    setEditNotes(meta.notes ?? "");
  };

  useEffect(() => {
    const tabParam = (searchParams.get("tab") ?? "").trim();
    if (tabParam === "create" || tabParam === "existing") {
      setActiveTab(tabParam);
    }

    const entryIdParam = Number(searchParams.get("entryId"));
    if (!Number.isFinite(entryIdParam) || entryIdParam <= 0) {
      setHighlightedEntryId(null);
      return;
    }

    const target = eligibleEntries.find((entry) => entry.id === entryIdParam);
    if (!target) return;

    setActiveTab("existing");
    setHighlightedEntryId(entryIdParam);

    if (searchParams.get("edit") === "1") {
      startEdit(target);
    }

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        const el = document.getElementById(`referral-entry-${entryIdParam}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    }
  }, [searchParams, eligibleEntries]);

  const saveEdit = async (id: number) => {
    setError(null);
    const resolvedType = getResolvedReferralType(editReferralType, editCustomReferralType);
    if (!resolvedType) {
      setError("Referral type is required.");
      return;
    }
    try {
      await updateReferral({
        id,
        data: {
          referalLink: editLink,
          discountPercent: editDiscount ? Number(editDiscount) : null,
          metadata: buildEditMetadata(),
        },
      }).unwrap();
      setEditingId(null);
      toast.success("Referral updated", "Changes saved successfully.");
    } catch (err: unknown) {
      if (
        (typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status?: number }).status === 409) ||
        getErrorMessage(err, "") === "A referral of this type already exists for this athlete"
      ) {
        setError("This athlete already has another referral with that type.");
        toast.warning("Duplicate referral type", "Choose a different referral type or edit the existing one.");
        return;
      }
      const message = getErrorMessage(err, "Please try again.");
      setError(message);
      toast.error("Update failed", message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this referral?")) return;
    setError(null);
    try {
      await deleteReferral({ id }).unwrap();
      toast.success("Referral deleted", "The referral has been removed.");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Please try again.");
      setError(message);
      toast.error("Delete failed", message);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  };

  const isSubmitting = creating || creatingBulk;

  return (
    <AdminShell
      title="Referrals"
      subtitle="Create coach-managed referrals for one athlete, an age range, or a grouped cohort."
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Coach referrals</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a referral to one athlete, an age-based segment, or a paid-program group without leaving this page.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="create">Create Referral</TabsTrigger>
            <TabsTrigger value="existing">Existing Referrals</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <SectionHeader
                title="Create Referral"
                description="Pick who this is for, then add the partner details and referral link."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Mode</label>
                  <Select value={targetMode} onChange={(event) => setTargetMode(event.target.value as TargetMode)}>
                    <option value="single">Single Athlete</option>
                    <option value="team">Team</option>
                    <option value="age_range">Age Range</option>
                    <option value="group">Group</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Type</label>
                  <Select value={referralType} onChange={(event) => setReferralType(event.target.value)}>
                    {REFERRAL_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Select>
                </div>
                {referralType === "Other" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom Type</label>
                    <Input value={customReferralType} onChange={(event) => setCustomReferralType(event.target.value)} placeholder="e.g. Mental Performance" />
                  </div>
                ) : null}
              </div>

              {targetMode === "single" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Athlete</label>
                  <Input value={athleteSearch} onChange={(event) => setAthleteSearch(event.target.value)} placeholder="Search athlete by name or guardian" />
                  {athleteLabel ? (
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                      <span>Selected: {athleteLabel}</span>
                      <button
                        type="button"
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-secondary/40"
                        onClick={() => {
                          setAthleteId("");
                          setAthleteLabel(null);
                          setAthleteSearch("");
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    {filteredAthletes.map((option) => (
                      <button
                        key={option.athleteId}
                        type="button"
                        className="rounded-2xl border border-border px-3 py-2 text-left text-xs text-foreground hover:bg-secondary/40"
                        onClick={() => {
                          setAthleteId(String(option.athleteId));
                          setAthleteLabel(option.label);
                          setAthleteSearch(option.label);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {!athleteId ? (
                    <p className="text-xs text-muted-foreground">You can target youth and adult athletes.</p>
                  ) : selectedAthleteTier ? (
                    <p className="text-xs text-muted-foreground">Program tier: <span className="text-foreground">{selectedAthleteTier}</span></p>
                  ) : null}
                </div>
              ) : null}

              {targetMode === "team" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team</label>
                  <Select value={teamName} onChange={(event) => setTeamName(event.target.value)}>
                    <option value="">Select a team</option>
                    {teamOptions.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">All athletes in this team are eligible (youth and adult).</p>
                </div>
              ) : null}

              {targetMode === "age_range" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age Option</label>
                      <Select value={ageMode} onChange={(event) => setAgeMode(event.target.value as AgeMode)}>
                        <option value="single_age">Single Age</option>
                        <option value="range_age">Age Range</option>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {ageMode === "single_age" ? "Age" : "Minimum Age"}
                      </label>
                      <Input
                        value={minAge}
                        onChange={(event) => setMinAge(event.target.value)}
                        type="number"
                        placeholder={ageMode === "single_age" ? "6" : "10"}
                      />
                    </div>
                    {ageMode === "range_age" ? (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maximum Age</label>
                        <Input value={maxAge} onChange={(event) => setMaxAge(event.target.value)} type="number" placeholder="14" />
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ageMode === "single_age"
                      ? "Use one exact age like 6, 7, or 8."
                      : "Use a minimum and maximum age to target a full range."}
                  </p>
                </div>
              ) : null}

              {targetMode === "group" ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saved Group</label>
                    <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                      <option value="">Select a saved group</option>
                      {referralGroups.map((group) => (
                        <option key={group.id} value={String(group.id)}>
                          {group.name} ({group.members.length}/{group.expectedSize})
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedReferralGroup
                        ? `${selectedReferralGroup.members.length} athlete${selectedReferralGroup.members.length === 1 ? "" : "s"} in ${selectedReferralGroup.name}.`
                        : "Choose an existing referral group or create a new reusable one below."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/15 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create Referral Group</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
                      <Input placeholder="How many athletes?" type="number" value={groupSize} onChange={(event) => setGroupSize(event.target.value)} />
                    </div>
                    <Input
                      placeholder="Search athletes to add"
                      value={groupAthleteSearch}
                      onChange={(event) => setGroupAthleteSearch(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      {groupAthleteIds.map((selectedId) => {
                        const option = athleteOptions.find((item) => item.athleteId === selectedId);
                        if (!option) return null;
                        return (
                          <button
                            key={selectedId}
                            type="button"
                            className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-secondary/40"
                            onClick={() => setGroupAthleteIds((prev) => prev.filter((id) => id !== selectedId))}
                          >
                            {option.label} ×
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-2">
                      {filteredGroupAthletes.map((option) => (
                        <button
                          key={option.athleteId}
                          type="button"
                          className="rounded-2xl border border-border px-3 py-2 text-left text-xs text-foreground hover:bg-secondary/40"
                          onClick={() => {
                            setGroupAthleteIds((prev) => Array.from(new Set([...prev, option.athleteId])));
                            setGroupAthleteSearch("");
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selected: {groupAthleteIds.length} athlete{groupAthleteIds.length === 1 ? "" : "s"}
                    </p>
                    <Button type="button" variant="outline" onClick={handleCreateGroup} disabled={creatingGroup}>
                      {creatingGroup ? "Saving Group..." : "Save Group"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-border bg-secondary/15 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Preview</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{targetedAthletes.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {targetMode === "single"
                    ? "Eligible athlete selected"
                    : targetMode === "team"
                      ? `Eligible athletes in ${teamName || "this team"}`
                    : targetMode === "age_range"
                      ? "Eligible athletes in this age range"
                      : `Eligible athletes in ${selectedReferralGroup?.name ?? "this group"}`}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Discount %</label>
                  <Input value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} placeholder="Optional" type="number" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Link</label>
                  <Input value={referalLink} onChange={(event) => setReferalLink(event.target.value)} placeholder="https://partner-provider.com/booking" />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partner Details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Provider / Contact Name" value={providerName} onChange={(event) => setProviderName(event.target.value)} />
                  <Input placeholder="Organisation / Company" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Image</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary/40">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          await uploadReferralImage(file, setImageUrl, setIsUploadingImage);
                          event.currentTarget.value = "";
                        }}
                      />
                      {isUploadingImage ? "Uploading..." : "Upload Image"}
                    </label>
                    {imageUrl ? (
                      <button
                        type="button"
                        className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                        onClick={() => setImageUrl("")}
                      >
                        Remove Image
                      </button>
                    ) : null}
                  </div>
                  {imageUrl ? (
                    <img src={imageUrl} alt="Referral preview" className="max-h-48 rounded-2xl border border-border object-cover" />
                  ) : (
                    <p className="text-xs text-muted-foreground">Optional. Add an image for this referral campaign.</p>
                  )}
                </div>
                <Input placeholder="Location / Address" value={location} onChange={(event) => setLocation(event.target.value)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                  <Input placeholder="Email" value={emailField} onChange={(event) => setEmailField(event.target.value)} />
                </div>
                <Input placeholder="Focus / Specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)} />
                <Textarea className="min-h-[80px]" placeholder="Additional notes for the athlete..." value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>

              <Button onClick={handleCreate} disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Saving..." : targetMode === "single" ? "Save Referral & Notify Athlete" : "Create Referrals & Notify Athletes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="mt-6">
          <Card>
            <CardHeader>
              <SectionHeader title="Existing Referrals" description="Most recent first." actionLabel="Create Referral" onAction={() => setActiveTab("create")} />
            </CardHeader>
            <CardContent>
              {error ? <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">Loading referrals...</div>
              ) : eligibleEntries.length === 0 ? (
                <EmptyState title="No referrals yet" description="Create your first referral." />
              ) : (
                <div className="space-y-3">
                  {eligibleEntries.map((entry) => {
                    const meta = (entry.metadata ?? {}) as ReferralMetadata;
                    const referralTypeLabel = resolveReferralType(meta);
                    const providerLabel = resolveProviderName(meta);
                    const organizationLabel = resolveOrganizationName(meta);
                    const hasMeta = !!(providerLabel || organizationLabel || meta.location || meta.phone || meta.email || meta.specialty || meta.notes);
                    const resolvedTier = athleteTierById.get(entry.athleteId) ?? entry.programTier ?? "PHP";

                    return (
                      <div
                        key={entry.id}
                        id={`referral-entry-${entry.id}`}
                        className={`rounded-3xl border bg-secondary/20 p-4 ${
                          highlightedEntryId === entry.id
                            ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]"
                            : "border-border"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[2px] text-muted-foreground">{formatDate(entry.createdAt)}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-foreground">{entry.athleteName ?? `Athlete #${entry.athleteId}`}</p>
                              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{referralTypeLabel}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Tier: {resolvedTier}</p>
                            <p className="text-xs text-muted-foreground">Target: {meta.targetLabel ?? "Individual athlete"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.referalLink ? (
                              <a href={entry.referalLink} target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-2 text-xs text-foreground">
                                Open Link
                              </a>
                            ) : null}
                            <button type="button" className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40" onClick={() => startEdit(entry)}>
                              Edit
                            </button>
                            <button type="button" className="rounded-full border border-red-500/40 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10" onClick={() => handleDelete(entry.id)}>
                              Delete
                            </button>
                          </div>
                        </div>

                        {hasMeta && editingId !== entry.id ? (
                          <div className="mt-3 space-y-1 rounded-2xl bg-secondary/30 px-4 py-3">
                            {meta.imageUrl ? (
                              <img src={meta.imageUrl} alt={`${referralTypeLabel} referral`} className="mb-3 max-h-48 rounded-2xl border border-border object-cover" />
                            ) : null}
                            {providerLabel ? <p className="text-sm font-medium text-foreground">{providerLabel}</p> : null}
                            {organizationLabel ? <p className="text-xs text-muted-foreground">{organizationLabel}</p> : null}
                            <div className="mt-1 flex flex-wrap gap-3">
                              {meta.location ? <span className="text-xs text-muted-foreground">📍 {meta.location}</span> : null}
                              {meta.phone ? <span className="text-xs text-muted-foreground">📞 {meta.phone}</span> : null}
                              {meta.email ? <span className="text-xs text-muted-foreground">✉️ {meta.email}</span> : null}
                            </div>
                            {meta.specialty ? <p className="mt-1 text-xs text-primary">Focus: {meta.specialty}</p> : null}
                            {meta.notes ? <p className="mt-1 text-xs italic text-muted-foreground">{meta.notes}</p> : null}
                          </div>
                        ) : null}

                        {editingId === entry.id ? (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                              <Select value={editReferralType} onChange={(event) => setEditReferralType(event.target.value)}>
                                {REFERRAL_TYPE_OPTIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </Select>
                              {editReferralType === "Other" ? (
                                <Input value={editCustomReferralType} onChange={(event) => setEditCustomReferralType(event.target.value)} placeholder="Custom referral type" />
                              ) : null}
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                              <Input value={editLink} onChange={(event) => setEditLink(event.target.value)} placeholder="Referral link" />
                              <Input value={editDiscount} onChange={(event) => setEditDiscount(event.target.value)} placeholder="Discount %" type="number" />
                            </div>
                            <div className="space-y-2 rounded-2xl border border-border bg-secondary/20 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partner Details</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input placeholder="Provider / Contact Name" value={editProviderName} onChange={(event) => setEditProviderName(event.target.value)} />
                                <Input placeholder="Organisation / Company" value={editOrganizationName} onChange={(event) => setEditOrganizationName(event.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="inline-flex cursor-pointer items-center rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary/40">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        await uploadReferralImage(file, setEditImageUrl, setIsUploadingEditImage);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    {isUploadingEditImage ? "Uploading..." : "Upload Image"}
                                  </label>
                                  {editImageUrl ? (
                                    <button
                                      type="button"
                                      className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                                      onClick={() => setEditImageUrl("")}
                                    >
                                      Remove Image
                                    </button>
                                  ) : null}
                                </div>
                                {editImageUrl ? (
                                  <img src={editImageUrl} alt="Referral preview" className="max-h-40 rounded-2xl border border-border object-cover" />
                                ) : null}
                              </div>
                              <Input placeholder="Location" value={editLocation} onChange={(event) => setEditLocation(event.target.value)} />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input placeholder="Phone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} />
                                <Input placeholder="Email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
                              </div>
                              <Input placeholder="Focus / Specialty" value={editSpecialty} onChange={(event) => setEditSpecialty(event.target.value)} />
                              <Textarea className="min-h-[60px]" placeholder="Notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => saveEdit(entry.id)}>Save</Button>
                              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : typeof entry.discountPercent === "number" ? (
                          <p className="mt-3 text-sm text-foreground">Discount: {entry.discountPercent}%</p>
                        ) : !hasMeta ? (
                          <p className="mt-3 text-xs text-muted-foreground">No partner details or discount set.</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
