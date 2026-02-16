"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { SectionHeader } from "../../components/admin/section-header";
import { EmptyState } from "../../components/admin/empty-state";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import {
  useCreatePhysioReferralMutation,
  useDeletePhysioReferralMutation,
  useGetPhysioReferralsQuery,
  useGetUsersQuery,
  useUpdatePhysioReferralMutation,
} from "../../lib/apiSlice";
import { toast } from "../../lib/toast";

type ReferralItem = {
  id: number;
  athleteId: number;
  athleteName?: string | null;
  programTier?: string | null;
  referalLink?: string | null;
  discountPercent?: number | null;
  createdAt?: string | null;
};

const TIERS = ["PHP", "PHP_Plus", "PHP_Premium"];

export default function PhysioReferralsPage() {
  const { data, isLoading } = useGetPhysioReferralsQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createReferral, { isLoading: creating }] = useCreatePhysioReferralMutation();
  const [updateReferral] = useUpdatePhysioReferralMutation();
  const [deleteReferral] = useDeletePhysioReferralMutation();
  const [athleteId, setAthleteId] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteLabel, setAthleteLabel] = useState<string | null>(null);
  const [programTier, setProgramTier] = useState("PHP");
  const [referalLink, setReferalLink] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const entries: ReferralItem[] = useMemo(() => data?.items ?? [], [data]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTier, setEditTier] = useState("PHP");
  const [editLink, setEditLink] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const athleteOptions = useMemo(() => {
    const users = usersData?.users ?? [];
    return users
      .filter((user: any) => user.athleteId)
      .map((user: any) => ({
        athleteId: user.athleteId as number,
        label: `${user.athleteName ?? "Athlete"} (Guardian: ${user.name ?? user.email ?? "Unknown"})`,
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

  const handleCreate = async () => {
    setError(null);
    if (!athleteId || !referalLink) {
      setError("Athlete ID and referral link are required.");
      return;
    }
    try {
      await createReferral({
        athleteId: Number(athleteId),
        programTier,
        referalLink,
        discountPercent: discountPercent ? Number(discountPercent) : undefined,
      }).unwrap();
      setAthleteId("");
      setAthleteSearch("");
      setAthleteLabel(null);
      setReferalLink("");
      setDiscountPercent("");
      toast.success("Referral saved", "The athlete now has a physio referral link.");
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
    setEditTier(entry.programTier ?? "PHP");
    setEditLink(entry.referalLink ?? "");
    setEditDiscount(
      typeof entry.discountPercent === "number" ? String(entry.discountPercent) : ""
    );
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      await updateReferral({
        id,
        data: {
          programTier: editTier,
          referalLink: editLink,
          discountPercent: editDiscount ? Number(editDiscount) : null,
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
    <AdminShell title="Physio Referrals" subtitle="Assign referral links and discounts per athlete.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <SectionHeader title="Create Referral" description="Add a new athlete referral." />
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            <div className="space-y-2">
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
                  Select an athlete to enable referral creation.
                </p>
              ) : null}
            </div>
            <Select value={programTier} onChange={(event) => setProgramTier(event.target.value)}>
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </Select>
            <Input
              value={referalLink}
              onChange={(event) => setReferalLink(event.target.value)}
              placeholder="https://physio-provider.com"
            />
            <Input
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              placeholder="Discount % (optional)"
              type="number"
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Saving..." : "Save Referral"}
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
            ) : entries.length === 0 ? (
              <EmptyState title="No referrals yet" description="Create your first physio referral." />
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-3xl border border-border bg-secondary/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[2px] text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {entry.athleteName ?? `Athlete #${entry.athleteId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tier: {entry.programTier ?? "PHP"}
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
                    {editingId === entry.id ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <Select value={editTier} onChange={(event) => setEditTier(event.target.value)}>
                          {TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier}
                            </option>
                          ))}
                        </Select>
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
                        <div className="col-span-full flex flex-wrap gap-2">
                          <Button onClick={() => saveEdit(entry.id)}>Save</Button>
                          <Button variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {typeof entry.discountPercent === "number" ? (
                          <p className="mt-3 text-sm text-foreground">
                            Discount: {entry.discountPercent}%
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">No discount set.</p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
