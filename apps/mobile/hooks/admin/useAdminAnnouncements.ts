import { useCallback, useState } from "react";
import { apiRequest } from "@/lib/api";

export type AdminAnnouncementAudienceType =
  | "all"
  | "athlete_type"
  | "team"
  | "group"
  | "tier";

export type AdminAnnouncementItem = {
  id: number | string;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
  createdBy?: number | string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean | null;
  announcementAudienceType?: AdminAnnouncementAudienceType | string | null;
  announcementAudienceAthleteType?: "youth" | "adult" | string | null;
  announcementAudienceTier?: string | null;
  announcementAudienceTeam?: string | null;
  announcementAudienceGroupId?: number | string | null;
  announcementStartsAt?: string | null;
  announcementEndsAt?: string | null;
};

type CreateAnnouncementInput = {
  title: string;
  body: string;
  audienceType: AdminAnnouncementAudienceType;
  athleteType?: "youth" | "adult";
  team?: string;
  groupId?: number;
  tier?: string;
  startsAt?: string;
  endsAt?: string;
};

function toCreateContentPayload(input: CreateAnnouncementInput) {
  return {
    title: input.title,
    content: input.title,
    body: input.body,
    type: "article",
    surface: "announcements",
    announcementAudienceType: input.audienceType,
    announcementAudienceAthleteType: input.athleteType,
    announcementAudienceTier: input.tier,
    announcementAudienceTeam: input.team,
    announcementAudienceGroupId: input.groupId,
    announcementStartsAt: input.startsAt,
    announcementEndsAt: input.endsAt,
  };
}

export function useAdminAnnouncements(token: string | null, canLoad: boolean) {
  const [items, setItems] = useState<AdminAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      if (!token || !canLoad) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ items?: AdminAnnouncementItem[] }>(
          "/content/announcements",
          {
            token,
            suppressStatusCodes: [403],
            skipCache: forceRefresh,
            forceRefresh,
          },
        );
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load announcements",
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [canLoad, token],
  );

  const create = useCallback(
    async (input: CreateAnnouncementInput) => {
      if (!token || !canLoad) return;
      setIsBusy(true);
      try {
        await apiRequest("/content", {
          method: "POST",
          token,
          body: toCreateContentPayload(input),
          skipCache: true,
        });
        await load(true);
      } finally {
        setIsBusy(false);
      }
    },
    [canLoad, load, token],
  );

  const update = useCallback(
    async (id: number, input: CreateAnnouncementInput) => {
      if (!token || !canLoad) return;
      setIsBusy(true);
      try {
        await apiRequest(`/content/${id}`, {
          method: "PUT",
          token,
          body: toCreateContentPayload(input),
          skipCache: true,
        });
        await load(true);
      } finally {
        setIsBusy(false);
      }
    },
    [canLoad, load, token],
  );

  const remove = useCallback(
    async (id: number) => {
      if (!token || !canLoad) return;
      setIsBusy(true);
      try {
        await apiRequest(`/content/${id}`, {
          method: "DELETE",
          token,
          skipCache: true,
        });
        setItems((prev) => prev.filter((item) => Number(item.id) !== id));
      } finally {
        setIsBusy(false);
      }
    },
    [canLoad, token],
  );

  return { items, loading, error, isBusy, load, create, update, remove };
}
