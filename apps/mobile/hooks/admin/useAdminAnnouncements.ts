import { useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAdminQuery } from "./useAdminQuery";
import { useAdminMutation } from "./useAdminQuery";

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
  const enabled = Boolean(token && canLoad);

  const fetcher = useCallback(
    async (forceRefresh: boolean) => {
      if (!token) return [];
      const res = await apiRequest<{ items?: AdminAnnouncementItem[] }>(
        "/content/announcements",
        { token, suppressStatusCodes: [403], skipCache: forceRefresh, forceRefresh },
      );
      return Array.isArray(res?.items) ? res.items : [];
    },
    [token],
  );

  const { data: items, loading, error, load, setData: setItems } = useAdminQuery<AdminAnnouncementItem[]>(
    fetcher,
    [],
    enabled,
  );

  const createMutation = useAdminMutation<CreateAnnouncementInput>(
    useCallback(
      async (input: CreateAnnouncementInput) => {
        if (!token) return;
        await apiRequest("/content", { method: "POST", token, body: toCreateContentPayload(input), skipCache: true });
        await load(true);
      },
      [token, load],
    ),
  );

  const updateMutation = useAdminMutation<{ id: number; input: CreateAnnouncementInput }>(
    useCallback(
      async ({ id, input }: { id: number; input: CreateAnnouncementInput }) => {
        if (!token) return;
        await apiRequest(`/content/${id}`, { method: "PUT", token, body: toCreateContentPayload(input), skipCache: true });
        await load(true);
      },
      [token, load],
    ),
  );

  const removeMutation = useAdminMutation<number>(
    useCallback(
      async (id: number) => {
        if (!token) return;
        await apiRequest(`/content/${id}`, { method: "DELETE", token, skipCache: true });
        setItems((prev) => prev.filter((item) => Number(item.id) !== id));
      },
      [token, setItems],
    ),
  );

  const isBusy = createMutation.busy || updateMutation.busy || removeMutation.busy;

  return {
    items,
    loading,
    error,
    isBusy,
    load,
    create: (input: CreateAnnouncementInput) => createMutation.run(input),
    update: (id: number, input: CreateAnnouncementInput) => updateMutation.run({ id, input }),
    remove: (id: number) => removeMutation.run(id),
  };
}
