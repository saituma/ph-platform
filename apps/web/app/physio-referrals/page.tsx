"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";
import { EmptyState } from "../../components/admin/empty-state";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  useCreatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetPhysioReferralsQuery,
  useGetUsersQuery,
  useUpdatePhysioReferralMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type PhysioMetadata = {
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
  metadata?: PhysioMetadata | null;
  createdAt?: string | null;
};

const ELIGIBLE_TIERS = new Set(["PHP_Plus", "PHP_Premium"]);

export default function PhysioReferralsPage() {
  const { data, isLoading } = useGetPhysioReferralsQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createReferral, { isLoading: creating }] = useCreatePhysioReferralMutation();
  const [updateReferral] = useUpdatePhysioReferralMutation();
  const [deleteReferral] = useDeletePhysioReferralMutation();

  // Create form state
  const [athleteId, setAthleteId] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteLabel, setAthleteLabel] = useState<string | null>(null);
  const [referalLink, setReferalLink] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Physio metadata
  const [physioName, setPhysioName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [emailField, setEmailField] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");

  const entries: ReferralItem[] = useMemo(() => data?.items ?? [], [data]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLink, setEditLink] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editPhysioName, setEditPhysioName] = useState("");
  const [editClinicName, setEditClinicName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editNotes, setEditNotes] = useState("");

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
  }, [athleteOptions, athleteSearch]);

  const resetCreateForm = () => {
    setAthleteId("");
    setAthleteSearch("");
    setAthleteLabel(null);
    setReferalLink("");
    setDiscountPercent("");
    setPhysioName("");
    setClinicName("");
    setLocation("");
    setPhone("");
    setEmailField("");
    setSpecialty("");
    setNotes("");
  };

  const buildMetadata = (): PhysioMetadata | null => {
    const meta: PhysioMetadata = {};
    if (physioName.trim()) meta.physioName = physioName.trim();
    if (clinicName.trim()) meta.clinicName = clinicName.trim();
    if (location.trim()) meta.location = location.trim();
    if (phone.trim()) meta.phone = phone.trim();
    if (emailField.trim()) meta.email = emailField.trim();
    if (specialty.trim()) meta.specialty = specialty.trim();
    if (notes.trim()) meta.notes = notes.trim();
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const buildEditMetadata = (): PhysioMetadata | null => {
    const meta: PhysioMetadata = {};
    if (editPhysioName.trim()) meta.physioName = editPhysioName.trim();
    if (editClinicName.trim()) meta.clinicName = editClinicName.trim();
    if (editLocation.trim()) meta.location = editLocation.trim();
    if (editPhone.trim()) meta.phone = editPhone.trim();
    if (editEmail.trim()) meta.email = editEmail.trim();
    if (editSpecialty.trim()) meta.specialty = editSpecialty.trim();
    if (editNotes.trim()) meta.notes = editNotes.trim();
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const handleCreate = async () => {
    setError(null);
    if (!athleteId || !referalLink) {
      setError("Athlete ID and referral link are required.");
      return;
    }
    if (!selectedAthleteTier || !ELIGIBLE_TIERS.has(selectedAthleteTier)) {
      setError("Physio referrals can only be sent to PHP Plus or PHP Premium athletes.");
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
      toast.success("Referral saved", "The athlete now has a physio referral link and will be notified.");
    } catch (err: any) {
      if (err?.status === 409 || err?.data?.error === "Referral already exists for this athlete") {
        setError("This athlete already has a referral. Edit the existing one instead.");
        toast.warning("Referral already exists", "Edit the existing referral instead.");
        return;
      }
      setError(err?.data?.error || "Failed to create referral.");
      toast.error("Failed to create referral", err?.data?.error || "Please try again.");
    }
  };

  const startEdit = (entry: ReferralItem) => {
    setEditingId(entry.id);
    setEditLink(entry.referalLink ?? "");
    setEditDiscount(
      typeof entry.discountPercent === "number" ? String(entry.discountPercent) : ""
    );
    const meta = (entry.metadata ?? {}) as PhysioMetadata;
    setEditPhysioName(meta.physioName ?? "");
    setEditClinicName(meta.clinicName ?? "");
    setEditLocation(meta.location ?? "");
    setEditPhone(meta.phone ?? "");
    setEditEmail(meta.email ?? "");
    setEditSpecialty(meta.specialty ?? "");
    setEditNotes(meta.notes ?? "");
  };

  const saveEdit = async (id: number) => {
    setError(null);
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
    <AdminShell title="Physio Referrals" subtitle="Assign referral links, physio details, and discounts per athlete.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="Create Referral" description="Add a new athlete referral with physio details." />
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {/* Athlete Search */}
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
                    onClick={() => { setAthleteId(""); setAthleteLabel(null); setAthleteSearch(""); }}
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
                    onClick={() => { setAthleteId(String(option.athleteId)); setAthleteLabel(option.label); setAthleteSearch(option.label); }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
	              {!athleteId ? (
	                <p className="text-xs text-muted-foreground">
	                  Only PHP Plus and PHP Premium athletes can receive physio referrals.
	                </p>
	              ) : selectedAthleteTier ? (
	                <p className="text-xs text-muted-foreground">
	                  Program tier: <span className="text-foreground">{selectedAthleteTier}</span>
	                </p>
	              ) : null}
	            </div>

	            {/* Tier & Link */}
	            <div className="grid gap-3 sm:grid-cols-2">
	              <div className="space-y-1">
	                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Discount %</label>
	                <Input
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  placeholder="Optional"
                  type="number"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Referral Link</label>
              <Input
                value={referalLink}
                onChange={(event) => setReferalLink(event.target.value)}
                placeholder="https://physio-provider.com/booking"
              />
            </div>

            {/* Physio Metadata */}
            <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Physio Details</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Physio Name" value={physioName} onChange={(e) => setPhysioName(e.target.value)} />
                <Input placeholder="Clinic Name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              </div>
              <Input placeholder="Location / Address" value={location} onChange={(e) => setLocation(e.target.value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Email" value={emailField} onChange={(e) => setEmailField(e.target.value)} />
              </div>
              <Input placeholder="Specialty (e.g. Sports Physio, ACL Rehab)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              <Textarea
                className="min-h-[80px]"
                placeholder="Additional notes for the athlete..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

	            <Button onClick={handleCreate} disabled={creating} className="w-full">
	              {creating ? "Saving..." : "Save Referral & Notify Athlete"}
	            </Button>
	          </CardContent>
	        </Card>

        <Card>
          <CardHeader>
            <SectionHeader title="Existing Referrals" description="Most recent first." />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading referrals...
              </div>
	            ) : entries.filter((entry) => ELIGIBLE_TIERS.has(athleteTierById.get(entry.athleteId) ?? entry.programTier ?? "PHP")).length === 0 ? (
	              <EmptyState title="No referrals yet" description="Create your first physio referral." />
	            ) : (
	              <div className="space-y-3">
	                {entries
	                  .filter((entry) =>
	                    ELIGIBLE_TIERS.has(athleteTierById.get(entry.athleteId) ?? entry.programTier ?? "PHP")
	                  )
	                  .map((entry) => {
	                  const meta = (entry.metadata ?? {}) as PhysioMetadata;
	                  const hasMeta = !!(meta.physioName || meta.clinicName || meta.location || meta.phone || meta.specialty);
	                  const resolvedTier = athleteTierById.get(entry.athleteId) ?? entry.programTier ?? "PHP";

	                  return (
	                    <div key={entry.id} className="rounded-3xl border border-border bg-secondary/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                            {formatDate(entry.createdAt)}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            {entry.athleteName ?? `Athlete #${entry.athleteId}`}
                          </p>
	                          <p className="text-xs text-muted-foreground">
	                            Tier: {resolvedTier}
	                          </p>
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

                      {/* Physio metadata display */}
                      {hasMeta && editingId !== entry.id && (
                        <div className="mt-3 rounded-2xl bg-secondary/30 px-4 py-3 space-y-1">
                          {meta.physioName && (
                            <p className="text-sm text-foreground font-medium">{meta.physioName}</p>
                          )}
                          {meta.clinicName && (
                            <p className="text-xs text-muted-foreground">{meta.clinicName}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-1">
                            {meta.location && (
                              <span className="text-xs text-muted-foreground">📍 {meta.location}</span>
                            )}
                            {meta.phone && (
                              <span className="text-xs text-muted-foreground">📞 {meta.phone}</span>
                            )}
                            {meta.email && (
                              <span className="text-xs text-muted-foreground">✉️ {meta.email}</span>
                            )}
                          </div>
                          {meta.specialty && (
                            <p className="text-xs text-primary mt-1">Specialty: {meta.specialty}</p>
                          )}
                          {meta.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{meta.notes}</p>
                          )}
                        </div>
                      )}

	                      {editingId === entry.id ? (
	                        <div className="mt-4 space-y-3">
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
                          <div className="rounded-2xl border border-border bg-secondary/20 p-3 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Physio Details</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input placeholder="Physio Name" value={editPhysioName} onChange={(e) => setEditPhysioName(e.target.value)} />
                              <Input placeholder="Clinic Name" value={editClinicName} onChange={(e) => setEditClinicName(e.target.value)} />
                            </div>
                            <Input placeholder="Location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input placeholder="Phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                              <Input placeholder="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                            </div>
                            <Input placeholder="Specialty" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} />
                            <Textarea className="min-h-[60px]" placeholder="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => saveEdit(entry.id)}>Save</Button>
                            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {typeof entry.discountPercent === "number" ? (
                            <p className="mt-3 text-sm text-foreground">
                              Discount: {entry.discountPercent}%
                            </p>
                          ) : !hasMeta ? (
                            <p className="mt-3 text-xs text-muted-foreground">No discount set.</p>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
