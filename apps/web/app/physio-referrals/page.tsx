"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "../../components/admin/shell";
import { EmptyState } from "../../components/admin/empty-state";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "../../components/ui/select";
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

type PartnerFields = {
  providerName: string;
  organizationName: string;
  imageUrl: string;
  location: string;
  phone: string;
  email: string;
  specialty: string;
  notes: string;
};

const EMPTY_PARTNER_FIELDS: PartnerFields = {
  providerName: "",
  organizationName: "",
  imageUrl: "",
  location: "",
  phone: "",
  email: "",
  specialty: "",
  notes: "",
};

const REFERRAL_TYPE_OPTIONS = ["Physio", "Stocks", "Nutrition", "Recovery", "Doctor", "Specialist", "Other"];
const PRESET_REFERRAL_TYPES = new Set(REFERRAL_TYPE_OPTIONS.filter((option) => option !== "Other"));
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

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

function PartnerDetailsForm({
  fields,
  onChange,
  imageUploading,
  onImageUpload,
}: {
  fields: PartnerFields;
  onChange: (patch: Partial<PartnerFields>) => void;
  imageUploading: boolean;
  onImageUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partner Details</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Provider / Contact Name</label>
          <Input
            value={fields.providerName}
            onChange={(e) => onChange({ providerName: e.target.value })}
            placeholder="e.g. Dr. Sarah Lee"
            aria-label="Provider or contact name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Organisation / Company</label>
          <Input
            value={fields.organizationName}
            onChange={(e) => onChange({ organizationName: e.target.value })}
            placeholder="e.g. PhysioFirst Clinic"
            aria-label="Organisation or company name"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Image</label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary/40">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload referral image"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_IMAGE_SIZE_BYTES) {
                  toast.error("File too large", "Please upload an image under 10 MB.");
                  return;
                }
                onImageUpload(file);
                (e.target as HTMLInputElement).value = "";
              }}
            />
            {imageUploading ? "Uploading..." : "Upload Image"}
          </label>
          {fields.imageUrl ? (
            <button
              type="button"
              className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
              onClick={() => onChange({ imageUrl: "" })}
            >
              Remove Image
            </button>
          ) : null}
        </div>
        {fields.imageUrl ? (
          <img src={fields.imageUrl} alt="Referral preview" className="max-h-48 rounded-2xl border border-border object-cover" />
        ) : (
          <p className="text-xs text-muted-foreground">Optional. Add an image for this referral campaign.</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Location / Address</label>
        <Input
          value={fields.location}
          onChange={(e) => onChange({ location: e.target.value })}
          placeholder="e.g. 123 Main St, Sydney"
          aria-label="Location or address"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Phone</label>
          <Input
            type="tel"
            value={fields.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="e.g. +61 400 000 000"
            aria-label="Phone number"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input
            type="email"
            value={fields.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="e.g. referrals@clinic.com"
            aria-label="Email address"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Focus / Specialty</label>
        <Input
          value={fields.specialty}
          onChange={(e) => onChange({ specialty: e.target.value })}
          placeholder="e.g. Sports rehabilitation"
          aria-label="Specialty or focus area"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Textarea
          className="min-h-[80px]"
          value={fields.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Additional notes for the athlete..."
          aria-label="Additional notes"
        />
      </div>
    </div>
  );
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
  const [partnerFields, setPartnerFields] = useState<PartnerFields>(EMPTY_PARTNER_FIELDS);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<number | null>(null);
  const [editReferralType, setEditReferralType] = useState("Physio");
  const [editCustomReferralType, setEditCustomReferralType] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editPartnerFields, setEditPartnerFields] = useState<PartnerFields>(EMPTY_PARTNER_FIELDS);
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);

  const entries: ReferralItem[] = useMemo(() => data?.items ?? [], [data]);
  const referralGroups: ReferralGroup[] = useMemo(() => referralGroupsData?.items ?? [], [referralGroupsData]);

  const updatePartnerFields = (patch: Partial<PartnerFields>) =>
    setPartnerFields((prev) => ({ ...prev, ...patch }));
  const updateEditPartnerFields = (patch: Partial<PartnerFields>) =>
    setEditPartnerFields((prev) => ({ ...prev, ...patch }));

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

  const selectedAthleteLabel = useMemo(() => {
    const id = Number(athleteId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return athleteOptions.find((o) => o.athleteId === id)?.label ?? null;
  }, [athleteId, athleteOptions]);

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

  const resetCreateForm = () => {
    setTargetMode("single");
    setAthleteId("");
    setTeamName("");
    setAthleteSearch("");
    setAgeMode("single_age");
    setMinAge("");
    setMaxAge("");
    setGroupId("");
    setReferralType("Physio");
    setCustomReferralType("");
    setReferalLink("");
    setDiscountPercent("");
    setPartnerFields(EMPTY_PARTNER_FIELDS);
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
    if (partnerFields.providerName.trim()) meta.providerName = partnerFields.providerName.trim();
    if (partnerFields.organizationName.trim()) meta.organizationName = partnerFields.organizationName.trim();
    if (partnerFields.imageUrl.trim()) meta.imageUrl = partnerFields.imageUrl.trim();
    if (partnerFields.location.trim()) meta.location = partnerFields.location.trim();
    if (partnerFields.phone.trim()) meta.phone = partnerFields.phone.trim();
    if (partnerFields.email.trim()) meta.email = partnerFields.email.trim();
    if (partnerFields.specialty.trim()) meta.specialty = partnerFields.specialty.trim();
    if (partnerFields.notes.trim()) meta.notes = partnerFields.notes.trim();
    return meta;
  };

  const buildEditMetadata = (): ReferralMetadata | null => {
    const resolvedType = getResolvedReferralType(editReferralType, editCustomReferralType);
    const meta: ReferralMetadata = {};
    if (resolvedType) meta.referralType = resolvedType;
    if (editPartnerFields.providerName.trim()) meta.providerName = editPartnerFields.providerName.trim();
    if (editPartnerFields.organizationName.trim()) meta.organizationName = editPartnerFields.organizationName.trim();
    if (editPartnerFields.imageUrl.trim()) meta.imageUrl = editPartnerFields.imageUrl.trim();
    if (editPartnerFields.location.trim()) meta.location = editPartnerFields.location.trim();
    if (editPartnerFields.phone.trim()) meta.phone = editPartnerFields.phone.trim();
    if (editPartnerFields.email.trim()) meta.email = editPartnerFields.email.trim();
    if (editPartnerFields.specialty.trim()) meta.specialty = editPartnerFields.specialty.trim();
    if (editPartnerFields.notes.trim()) meta.notes = editPartnerFields.notes.trim();
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
      if (parsedMin < 3 || parsedMax > 100) {
        setError("Age must be between 3 and 100.");
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
    setEditPartnerFields({
      providerName: resolveProviderName(meta),
      organizationName: resolveOrganizationName(meta),
      imageUrl: meta.imageUrl ?? "",
      location: meta.location ?? "",
      phone: meta.phone ?? "",
      email: meta.email ?? "",
      specialty: meta.specialty ?? "",
      notes: meta.notes ?? "",
    });
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

    const target = entries.find((entry) => entry.id === entryIdParam);
    if (!target) return;

    setActiveTab("existing");
    setHighlightedEntryId(entryIdParam);

    if (searchParams.get("edit") === "1") {
      startEdit(target);
    }

    const frame = requestAnimationFrame(() => {
      const el = document.getElementById(`referral-entry-${entryIdParam}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [searchParams, entries]);

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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Coach referrals</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a referral to one athlete, an age-based segment, or a paid-program group without leaving this page.
            </p>
          </div>
          <div className="overflow-x-auto pb-1">
            <TabsList className="min-w-max">
              <TabsTrigger value="create">Create Referral</TabsTrigger>
              <TabsTrigger value="existing">Existing Referrals</TabsTrigger>
            </TabsList>
          </div>
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
              {error ? (
                <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target Mode</label>
                  {(() => {
                    const targetModeItems = [
                      { label: "Single Athlete", value: "single" },
                      { label: "Team", value: "team" },
                      { label: "Age Range", value: "age_range" },
                      { label: "Group", value: "group" },
                    ];
                    return (
                      <Select items={targetModeItems} value={targetMode} onValueChange={(v) => setTargetMode(v as TargetMode)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectPopup>
                          {targetModeItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Type</label>
                  {(() => {
                    const referralTypeItems = REFERRAL_TYPE_OPTIONS.map((option) => ({ label: option, value: option }));
                    return (
                      <Select items={referralTypeItems} value={referralType} onValueChange={(v) => setReferralType(v ?? "")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectPopup>
                          {referralTypeItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
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
                  <Input
                    value={athleteSearch}
                    onChange={(event) => setAthleteSearch(event.target.value)}
                    placeholder="Search athlete by name or guardian"
                    aria-label="Search athletes"
                  />
                  {selectedAthleteLabel ? (
                    <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                      <span>Selected: {selectedAthleteLabel}</span>
                      <button
                        type="button"
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-secondary/40"
                        onClick={() => {
                          setAthleteId("");
                          setAthleteSearch("");
                        }}
                        aria-label="Clear athlete selection"
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-2" role="listbox" aria-label="Athlete search results">
                    {filteredAthletes.map((option) => (
                      <button
                        key={option.athleteId}
                        type="button"
                        role="option"
                        aria-selected={athleteId === String(option.athleteId)}
                        className="rounded-2xl border border-border px-3 py-2 text-left text-xs text-foreground hover:bg-secondary/40"
                        onClick={() => {
                          setAthleteId(String(option.athleteId));
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
                  {(() => {
                    const teamSelectItems = [
                      { label: "Select a team", value: "" },
                      ...teamOptions.map((team) => ({ label: team, value: team })),
                    ];
                    return (
                      <Select items={teamSelectItems} value={teamName} onValueChange={(v) => setTeamName(v ?? "")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectPopup>
                          {teamSelectItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground">All athletes in this team are eligible (youth and adult).</p>
                </div>
              ) : null}

              {targetMode === "age_range" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age Option</label>
                      {(() => {
                        const ageModeItems = [
                          { label: "Single Age", value: "single_age" },
                          { label: "Age Range", value: "range_age" },
                        ];
                        return (
                          <Select items={ageModeItems} value={ageMode} onValueChange={(v) => setAgeMode(v as AgeMode)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectPopup>
                              {ageModeItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                              ))}
                            </SelectPopup>
                          </Select>
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {ageMode === "single_age" ? "Age" : "Minimum Age"}
                      </label>
                      <Input
                        value={minAge}
                        onChange={(event) => setMinAge(event.target.value)}
                        type="number"
                        min={3}
                        max={100}
                        placeholder={ageMode === "single_age" ? "6" : "10"}
                        aria-label={ageMode === "single_age" ? "Age" : "Minimum age"}
                      />
                    </div>
                    {ageMode === "range_age" ? (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Maximum Age</label>
                        <Input
                          value={maxAge}
                          onChange={(event) => setMaxAge(event.target.value)}
                          type="number"
                          min={3}
                          max={100}
                          placeholder="14"
                          aria-label="Maximum age"
                        />
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
                    {(() => {
                      const groupSelectItems = [
                        { label: "Select a saved group", value: "" },
                        ...referralGroups.map((group) => ({
                          label: `${group.name} (${group.members.length}/${group.expectedSize})`,
                          value: String(group.id),
                        })),
                      ];
                      return (
                        <Select items={groupSelectItems} value={groupId} onValueChange={(v) => setGroupId(v ?? "")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectPopup>
                            {groupSelectItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground">
                      {selectedReferralGroup
                        ? `${selectedReferralGroup.members.length} athlete${selectedReferralGroup.members.length === 1 ? "" : "s"} in ${selectedReferralGroup.name}.`
                        : "Choose an existing referral group or create a new reusable one below."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/15 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create Referral Group</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input placeholder="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} aria-label="Group name" />
                      <Input placeholder="How many athletes?" type="number" min={1} value={groupSize} onChange={(event) => setGroupSize(event.target.value)} aria-label="Expected group size" />
                    </div>
                    <Input
                      placeholder="Search athletes to add"
                      value={groupAthleteSearch}
                      onChange={(event) => setGroupAthleteSearch(event.target.value)}
                      aria-label="Search athletes for group"
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
                            aria-label={`Remove ${option.label}`}
                          >
                            {option.label} &times;
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
                  <Input
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                    placeholder="Optional"
                    type="number"
                    min={0}
                    max={100}
                    aria-label="Discount percentage"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Link</label>
                  <Input
                    value={referalLink}
                    onChange={(event) => setReferalLink(event.target.value)}
                    placeholder="https://partner-provider.com/booking"
                    type="url"
                    aria-label="Referral link URL"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                <PartnerDetailsForm
                  fields={partnerFields}
                  onChange={updatePartnerFields}
                  imageUploading={isUploadingImage}
                  onImageUpload={(file) =>
                    uploadReferralImage(file, (url) => updatePartnerFields({ imageUrl: url }), setIsUploadingImage)
                  }
                />
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
              {error ? (
                <div role="alert" className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">Loading referrals...</div>
              ) : entries.length === 0 ? (
                <EmptyState title="No referrals yet" description="Create your first referral." />
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => {
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
                              <a
                                href={entry.referalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                                aria-label={`Open referral link for ${entry.athleteName ?? "athlete"}`}
                              >
                                Open Link
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                              onClick={() => startEdit(entry)}
                              aria-label={`Edit referral for ${entry.athleteName ?? "athlete"}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-red-500/40 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
                              onClick={() => handleDelete(entry.id)}
                              aria-label={`Delete referral for ${entry.athleteName ?? "athlete"}`}
                            >
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
                              {meta.location ? <span className="text-xs text-muted-foreground">Location: {meta.location}</span> : null}
                              {meta.phone ? <span className="text-xs text-muted-foreground">Phone: {meta.phone}</span> : null}
                              {meta.email ? <span className="text-xs text-muted-foreground">Email: {meta.email}</span> : null}
                            </div>
                            {meta.specialty ? <p className="mt-1 text-xs text-primary">Focus: {meta.specialty}</p> : null}
                            {meta.notes ? <p className="mt-1 text-xs italic text-muted-foreground">{meta.notes}</p> : null}
                          </div>
                        ) : null}

                        {editingId === entry.id ? (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                              {(() => {
                                const editReferralTypeItems = REFERRAL_TYPE_OPTIONS.map((option) => ({ label: option, value: option }));
                                return (
                                  <Select items={editReferralTypeItems} value={editReferralType} onValueChange={(v) => setEditReferralType(v ?? "")}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectPopup>
                                      {editReferralTypeItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                      ))}
                                    </SelectPopup>
                                  </Select>
                                );
                              })()}
                              {editReferralType === "Other" ? (
                                <Input value={editCustomReferralType} onChange={(event) => setEditCustomReferralType(event.target.value)} placeholder="Custom referral type" />
                              ) : null}
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                              <Input value={editLink} onChange={(event) => setEditLink(event.target.value)} placeholder="Referral link" type="url" aria-label="Edit referral link" />
                              <Input value={editDiscount} onChange={(event) => setEditDiscount(event.target.value)} placeholder="Discount %" type="number" min={0} max={100} aria-label="Edit discount percentage" />
                            </div>
                            <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                              <PartnerDetailsForm
                                fields={editPartnerFields}
                                onChange={updateEditPartnerFields}
                                imageUploading={isUploadingEditImage}
                                onImageUpload={(file) =>
                                  uploadReferralImage(file, (url) => updateEditPartnerFields({ imageUrl: url }), setIsUploadingEditImage)
                                }
                              />
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
