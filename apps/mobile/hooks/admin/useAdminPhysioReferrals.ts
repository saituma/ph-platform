import { apiRequest } from "@/lib/api";
import { useCallback, useState } from "react";

export type AdminPhysioReferralMetadata = {
  assignmentMode?: string | null;
  referralType?: string | null;
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

export type AdminPhysioReferralItem = {
  id: number;
  athleteId?: number | null;
  athleteName?: string | null;
  programTier?: string | null;
  referalLink?: string | null;
  discountPercent?: number | null;
  metadata?: AdminPhysioReferralMetadata | null;
  createdAt?: string | null;
};

export function useAdminPhysioReferrals(token: string | null, canLoad: boolean) {
  const [items, setItems] = useState<AdminPhysioReferralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  const load = useCallback(
    async (params: { q?: string; limit?: number } = {}, forceRefresh = false) => {
      if (!canLoad || !token) return;
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (params.q?.trim()) query.set("q", params.q.trim());
        if (typeof params.limit === "number") query.set("limit", String(params.limit));
        const qs = query.toString();
        const res = await apiRequest<{ items?: AdminPhysioReferralItem[] }>(
          qs ? `/admin/physio-referrals?${qs}` : "/admin/physio-referrals",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load referrals");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [canLoad, token],
  );

  const create = useCallback(
    async (body: Record<string, unknown>) => {
      if (!canLoad || !token) return;
      setMutatingId(-1);
      try {
        await apiRequest("/admin/physio-referrals", {
          method: "POST",
          token,
          body,
          suppressStatusCodes: [400, 403],
          skipCache: true,
          forceRefresh: true,
        });
      } finally {
        setMutatingId(null);
      }
    },
    [canLoad, token],
  );

  const update = useCallback(
    async (id: number, patch: Record<string, unknown>) => {
      if (!canLoad || !token) return;
      setMutatingId(id);
      try {
        await apiRequest(`/admin/physio-referrals/${id}`, {
          method: "PATCH",
          token,
          body: patch,
          suppressStatusCodes: [400, 403],
          skipCache: true,
          forceRefresh: true,
        });
      } finally {
        setMutatingId(null);
      }
    },
    [canLoad, token],
  );

  const remove = useCallback(
    async (id: number) => {
      if (!canLoad || !token) return;
      setMutatingId(id);
      try {
        await apiRequest(`/admin/physio-referrals/${id}`, {
          method: "DELETE",
          token,
          suppressStatusCodes: [403],
          skipCache: true,
          forceRefresh: true,
        });
      } finally {
        setMutatingId(null);
      }
    },
    [canLoad, token],
  );

  return {
    items,
    loading,
    error,
    mutatingId,
    load,
    create,
    update,
    remove,
    setError,
  };
}

