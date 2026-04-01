"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { EmptyState } from "../../components/admin/empty-state";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  useCreatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetPhysioReferralsQuery,
  useGetUsersQuery,
  useUpdatePhysioReferralMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type ReferralMetadata = {
  referralType?: string | null;
  providerName?: string | null;
  organizationName?: string | null;
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

const ELIGIBLE_TIERS = new Set(["PHP_Plus", "PHP_Premium"]);
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

export default function ReferralsPage() {
  const { data, isLoading } = useGetPhysioReferralsQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createReferral, { isLoading: creating }] = useCreatePhysioReferralMutation();
  const [updateReferral] = useUpdatePhysioReferralMutation();
  const [deleteReferral] = useDeletePhysioReferralMutation();

  const [activeTab, setActiveTab] = useState("create");
  const [athleteId, setAthleteId] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteLabel, setAthleteLabel] = useState<string | null>(null);
  const [referralType, setReferralType] = useState("Physio");
  const [customReferralType, setCustomReferralType] = useState("");
  const [referalLink, setReferalLink] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [providerName, setProviderName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [emailField, setEmailField] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReferralType, setEditReferralType] = useState("Physio");
  const [editCustomReferralType, setEditCustomReferralType] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editProviderName, setEditProviderName] = useState("");
  const [editOrganizationName, setEditOrganizationName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const entries: ReferralItem[] = useMemo(() => data?.items ?? [], [data]);

  const athleteTierById = useMemo(() => {
    const users = usersData?.users ?? [];
    const map = new Map<number, string>();
    users.forEach((user: any) => {
      const aId = user.athleteId ? Number(user.athleteId) : null;
      if (!aId) return;
      const tier = (user.programTier ?? user.guardianProgramTier ?? user.currentProgramTier ?? null) as string | null;
      if (tier) map.set(aId, tier);
    });
    return map;
  }, [usersData]);

  const eligibleEntries = useMemo(
    () =>
      entries.filter((entry) =>
        ELIGIBLE_TIERS.has(athleteTierById.get(entry.athleteId) ?? entry.programTier ?? "PHP")
      ),
    [athleteTierById, entries]
  );

  const selectedAthleteTier = useMemo(() => {
    const id = Number(athleteId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return athleteTierById.get(id) ?? null;
  }, [athleteId, athleteTierById]);

  const athleteOptions = useMemo(() => {
    const users = usersData?.users ?? [];
    return users
      .filter((user: any) => user.athleteId)
      .map((user: any) => {
        const tier = (user.programTier ?? user.guardianProgramTier ?? user.currentProgramTier ?? null) as string | null;
        return { ...user, _tier: tier };
      })
      .filter((user: any) => ELIGIBLE_TIERS.has(user._tier))
      .map((user: any) => ({
        athleteId: user.athleteId as number,
        tier: user._tier as string,
        label: `${user.athleteName ?? "Athlete"} (Guardian: ${user.name ?? user.email ?? "Unknown"}) • ${user._tier}`,
      }));
  }, [usersData]);

  const filteredAthletes = useMemo(() => {
    if (athleteId) return [];
    if (!athleteSearch.trim()) return athleteOptions.slice(0, 6);
    const needle = athleteSearch.trim().toLowerCase();
    return athleteOptions
      .filter((option) => option.label.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [athleteId, athleteOptions, athleteSearch]);

  const resetCreateForm = () => {
    setAthleteId("");
    setAthleteSearch("");
    setAthleteLabel(null);
    setReferralType("Physio");
    setCustomReferralType("");
    setReferalLink("");
    setDiscountPercent("");
    setProviderName("");
    setOrganizationName("");
    setLocation("");
    setPhone("");
    setEmailField("");
    setSpecialty("");
    setNotes("");
  };

  const getResolvedReferralType = (selectedType: string, customType: string) =>
    (selectedType === "Other" ? customType : selectedType).trim();

  const buildMetadata = (): ReferralMetadata | null => {
    const resolvedType = getResolvedReferralType(referralType, customReferralType);
    const meta: ReferralMetadata = {};
    if (resolvedType) meta.referralType = resolvedType;
    if (providerName.trim()) meta.providerName = providerName.trim();
    if (organizationName.trim()) meta.organizationName = organizationName.trim();
    if (location.trim()) meta.location = location.trim();
    if (phone.trim()) meta.phone = phone.trim();
    if (emailField.trim()) meta.email = emailField.trim();
    if (specialty.trim()) meta.specialty = specialty.trim();
    if (notes.trim()) meta.notes = notes.trim();
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const buildEditMetadata = (): ReferralMetadata | null => {
    const resolvedType = getResolvedReferralType(editReferralType, editCustomReferralType);
    const meta: ReferralMetadata = {};
    if (resolvedType) meta.referralType = resolvedType;
    if (editProviderName.trim()) meta.providerName = editProviderName.trim();
    if (editOrganizationName.trim()) meta.organizationName = editOrganizationName.trim();
    if (editLocation.trim()) meta.location = editLocation.trim();
    if (editPhone.trim()) meta.phone = editPhone.trim();
    if (editEmail.trim()) meta.email = editEmail.trim();
    if (editSpecialty.trim()) meta.specialty = editSpecialty.trim();
    if (editNotes.trim()) meta.notes = editNotes.trim();
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const handleCreate = async () => {
    setError(null);
    const resolvedType = getResolvedReferralType(referralType, customReferralType);
    if (!resolvedType) {
      setError("Referral type is required.");
      return;
    }
    if (!athleteId || !referalLink) {
      setError("Athlete and referral link are required.");
      return;
    }
    if (!selectedAthleteTier || !ELIGIBLE_TIERS.has(selectedAthleteTier)) {
      setError("Referrals can only be sent to PHP Plus or PHP Premium athletes.");
      return;
    }
    try {
      await createReferral({
        athleteId: Number(athleteId),
        programTier: selectedAthleteTier,
        referalLink,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
        metadata: buildMetadata(),
      }).unwrap();
      resetCreateForm();
      setActiveTab("existing");
      toast.success("Referral saved", "The athlete now has a referral and will be notified.");
    } catch (err: any) {
      if (
        err?.status === 409 ||
        err?.data?.error === "Referral already exists for this athlete" ||
        err?.data?.error === "A referral of this type already exists for this athlete"
      ) {
        setError("This athlete already has a referral with that type. Edit the existing one instead.");
        toast.warning("Referral already exists", "Edit the existing referral instead.");
        return;
      }
      setError(err?.data?.error || "Failed to create referral.");
      toast.error("Failed to create referral", err?.data?.error || "Please try again.");
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
    setEditLocation(meta.location ?? "");
    setEditPhone(meta.phone ?? "");
    setEditEmail(meta.email ?? "");
    setEditSpecialty(meta.specialty ?? "");
    setEditNotes(meta.notes ?? "");
  };

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
    } catch (err: any) {
      if (err?.status === 409 || err?.data?.error === "A referral of this type already exists for this athlete") {
        setError("This athlete already has another referral with that type.");
        toast.warning("Duplicate referral type", "Choose a different referral type or edit the existing one.");
        return;
      }
      setError(err?.data?.error || "Failed to update referral.");
      toast.error("Update failed", err?.data?.error || "Please try again.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this referral?")) return;
    setError(null);
    try {
      await deleteReferral({ id }).unwrap();
      toast.success("Referral deleted", "The referral has been removed.");
    } catch (err: any) {
      setError(err?.data?.error || "Failed to delete referral.");
      toast.error("Delete failed", err?.data?.error || "Please try again.");
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  };

  return (
    <AdminShell
      title="Referrals"
      subtitle="Create coach-managed referrals for physio, stocks, nutrition, recovery, and any other trusted partner."
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Coach referrals</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep referral creation focused, and review existing referrals without the form crowding the list.
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
                description="Add a new referral with a type, partner details, and an athlete-facing link."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Referral Type
                  </label>
                  <Select value={referralType} onChange={(event) => setReferralType(event.target.value)}>
                    {REFERRAL_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
                {referralType === "Other" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Custom Type
                    </label>
                    <Input
                      value={customReferralType}
                      onChange={(event) => setCustomReferralType(event.target.value)}
                      placeholder="e.g. Mental Performance"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Athlete</label>
                <Input
                  value={athleteSearch}
                  onChange={(event) => setAthleteSearch(event.target.value)}
                  placeholder="Search athlete by name or guardian"
                />
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
                  <p className="text-xs text-muted-foreground">
                    Only PHP Plus and PHP Premium athletes can receive coach-created referrals.
                  </p>
                ) : selectedAthleteTier ? (
                  <p className="text-xs text-muted-foreground">
                    Program tier: <span className="text-foreground">{selectedAthleteTier}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Discount %
                  </label>
                  <Input
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                    placeholder="Optional"
                    type="number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Referral Link
                  </label>
                  <Input
                    value={referalLink}
                    onChange={(event) => setReferalLink(event.target.value)}
                    placeholder="https://partner-provider.com/booking"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Partner Details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Provider / Contact Name"
                    value={providerName}
                    onChange={(event) => setProviderName(event.target.value)}
                  />
                  <Input
                    placeholder="Organisation / Company"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                  />
                </div>
                <Input
                  placeholder="Location / Address"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
                  <Input
                    placeholder="Email"
                    value={emailField}
                    onChange={(event) => setEmailField(event.target.value)}
                  />
                </div>
                <Input
                  placeholder="Focus / Specialty"
                  value={specialty}
                  onChange={(event) => setSpecialty(event.target.value)}
                />
                <Textarea
                  className="min-h-[80px]"
                  placeholder="Additional notes for the athlete..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? "Saving..." : "Save Referral & Notify Athlete"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="existing" className="mt-6">
          <Card>
            <CardHeader>
              <SectionHeader
                title="Existing Referrals"
                description="Most recent first."
                actionLabel="Create Referral"
                onAction={() => setActiveTab("create")}
              />
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                  Loading referrals...
                </div>
              ) : eligibleEntries.length === 0 ? (
                <EmptyState title="No referrals yet" description="Create your first referral." />
              ) : (
                <div className="space-y-3">
                  {eligibleEntries.map((entry) => {
                    const meta = (entry.metadata ?? {}) as ReferralMetadata;
                    const referralTypeLabel = resolveReferralType(meta);
                    const providerLabel = resolveProviderName(meta);
                    const organizationLabel = resolveOrganizationName(meta);
                    const hasMeta = !!(
                      providerLabel ||
                      organizationLabel ||
                      meta.location ||
                      meta.phone ||
                      meta.email ||
                      meta.specialty ||
                      meta.notes
                    );
                    const resolvedTier = athleteTierById.get(entry.athleteId) ?? entry.programTier ?? "PHP";

                    return (
                      <div key={entry.id} className="rounded-3xl border border-border bg-secondary/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-foreground">
                                {entry.athleteName ?? `Athlete #${entry.athleteId}`}
                              </p>
                              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                {referralTypeLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">Tier: {resolvedTier}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.referalLink ? (
                              <a
                                href={entry.referalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-border px-3 py-2 text-xs text-foreground"
                              >
                                Open Link
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/40"
                              onClick={() => startEdit(entry)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-red-500/40 px-3 py-2 text-xs text-red-200 hover:bg-red-500/10"
                              onClick={() => handleDelete(entry.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {hasMeta && editingId !== entry.id ? (
                          <div className="mt-3 space-y-1 rounded-2xl bg-secondary/30 px-4 py-3">
                            {providerLabel ? (
                              <p className="text-sm font-medium text-foreground">{providerLabel}</p>
                            ) : null}
                            {organizationLabel ? (
                              <p className="text-xs text-muted-foreground">{organizationLabel}</p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap gap-3">
                              {meta.location ? (
                                <span className="text-xs text-muted-foreground">📍 {meta.location}</span>
                              ) : null}
                              {meta.phone ? (
                                <span className="text-xs text-muted-foreground">📞 {meta.phone}</span>
                              ) : null}
                              {meta.email ? (
                                <span className="text-xs text-muted-foreground">✉️ {meta.email}</span>
                              ) : null}
                            </div>
                            {meta.specialty ? (
                              <p className="mt-1 text-xs text-primary">Focus: {meta.specialty}</p>
                            ) : null}
                            {meta.notes ? (
                              <p className="mt-1 text-xs italic text-muted-foreground">{meta.notes}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {editingId === entry.id ? (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                              <Select
                                value={editReferralType}
                                onChange={(event) => setEditReferralType(event.target.value)}
                              >
                                {REFERRAL_TYPE_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </Select>
                              {editReferralType === "Other" ? (
                                <Input
                                  value={editCustomReferralType}
                                  onChange={(event) => setEditCustomReferralType(event.target.value)}
                                  placeholder="Custom referral type"
                                />
                              ) : null}
                            </div>
                            <div className="grid gap-3 lg:grid-cols-2">
                              <Input
                                value={editLink}
                                onChange={(event) => setEditLink(event.target.value)}
                                placeholder="Referral link"
                              />
                              <Input
                                value={editDiscount}
                                onChange={(event) => setEditDiscount(event.target.value)}
                                placeholder="Discount %"
                                type="number"
                              />
                            </div>
                            <div className="space-y-2 rounded-2xl border border-border bg-secondary/20 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Partner Details
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Provider / Contact Name"
                                  value={editProviderName}
                                  onChange={(event) => setEditProviderName(event.target.value)}
                                />
                                <Input
                                  placeholder="Organisation / Company"
                                  value={editOrganizationName}
                                  onChange={(event) => setEditOrganizationName(event.target.value)}
                                />
                              </div>
                              <Input
                                placeholder="Location"
                                value={editLocation}
                                onChange={(event) => setEditLocation(event.target.value)}
                              />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Phone"
                                  value={editPhone}
                                  onChange={(event) => setEditPhone(event.target.value)}
                                />
                                <Input
                                  placeholder="Email"
                                  value={editEmail}
                                  onChange={(event) => setEditEmail(event.target.value)}
                                />
                              </div>
                              <Input
                                placeholder="Focus / Specialty"
                                value={editSpecialty}
                                onChange={(event) => setEditSpecialty(event.target.value)}
                              />
                              <Textarea
                                className="min-h-[60px]"
                                placeholder="Notes"
                                value={editNotes}
                                onChange={(event) => setEditNotes(event.target.value)}
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => saveEdit(entry.id)}>Save</Button>
                              <Button variant="outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
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
