import { apiSlice } from "../core";

export type SessionTemplateRecord = {
  id: number;
  name: string;
  type: "one_to_one" | "semi_private" | "in_person" | "team";
  scope: "individual" | "group" | "team";
  isRecurring: boolean;
  weekday?: number | null;
  startsAtTime: string;
  endsAtTime: string;
  location?: string | null;
  meetingLink?: string | null;
  notes?: string | null;
  teamId?: number | null;
  targetUserIds?: number[] | null;
  googleSyncEnabled?: boolean;
  isActive?: boolean;
};

export type ScheduledSessionAdminRecord = {
  id: number;
  name: string;
  type: "one_to_one" | "semi_private" | "in_person" | "team";
  scope: "individual" | "group" | "team";
  startsAt: string;
  endsAt: string;
  attendees: Array<{
    userId: number;
    status: "unmarked" | "attended" | "missed";
    userName?: string | null;
    userEmail?: string | null;
    checkInAt?: string | null;
  }>;
};

const adminSessionScheduleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminGoogleCalendarConnection: builder.query<
      {
        connected: boolean;
        calendarId?: string | null;
        serviceAccountEmail?: string | null;
        accountEmail?: string | null;
        mode?: "oauth" | "service_account" | null;
        connectedAt?: string | null;
      },
      void
    >({
      query: () => "/admin/google-calendar/connection",
      providesTags: ["CalendarConnection"],
    }),
    getAdminGoogleCalendarOAuthStart: builder.query<{ authUrl: string }, void>({
      query: () => "/admin/google-calendar/oauth/start",
    }),
    getAdminGoogleCalendars: builder.query<{ calendars: Array<{ id: string; summary: string; primary: boolean }> }, void>({
      query: () => "/admin/google-calendar/calendars",
      providesTags: ["CalendarConnection"],
    }),
    selectAdminGoogleCalendar: builder.mutation<{ ok: true }, { calendarId: string }>({
      query: (body) => ({
        url: "/admin/google-calendar/select",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CalendarConnection"],
    }),
    connectAdminGoogleCalendar: builder.mutation<
      { ok: true },
      { calendarId: string; serviceAccountEmail: string; privateKey: string }
    >({
      query: (body) => ({
        url: "/admin/google-calendar/connection",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CalendarConnection"],
    }),
    disconnectAdminGoogleCalendar: builder.mutation<{ ok: true }, void>({
      query: () => ({
        url: "/admin/google-calendar/connection",
        method: "DELETE",
      }),
      invalidatesTags: ["CalendarConnection"],
    }),
    getAdminSessionTemplates: builder.query<{ templates: SessionTemplateRecord[] }, void>({
      query: () => "/admin/session-templates",
      providesTags: ["SessionTemplates"],
    }),
    createAdminSessionTemplate: builder.mutation<
      { template: SessionTemplateRecord },
      Omit<SessionTemplateRecord, "id">
    >({
      query: (body) => ({
        url: "/admin/session-templates",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SessionTemplates"],
    }),
    materializeAdminSessionTemplate: builder.mutation<
      { created: number; sessionIds: number[] },
      { templateId: number; from: string; to: string }
    >({
      query: ({ templateId, from, to }) => ({
        url: `/admin/session-templates/${templateId}/materialize`,
        method: "POST",
        body: { from, to },
      }),
      invalidatesTags: ["ScheduledSessions"],
    }),
    getAdminScheduledSessions: builder.query<
      { sessions: ScheduledSessionAdminRecord[] },
      { from?: string; to?: string; userId?: number } | void
    >({
      query: (params) => {
        if (!params || (!params.from && !params.to && !params.userId)) return "/admin/scheduled-sessions";
        const query = new URLSearchParams();
        if (params.from) query.set("from", params.from);
        if (params.to) query.set("to", params.to);
        if (params.userId) query.set("userId", String(params.userId));
        return `/admin/scheduled-sessions?${query.toString()}`;
      },
      providesTags: ["ScheduledSessions"],
    }),
    markAdminSessionAttendance: builder.mutation<
      { updated: number },
      {
        sessionId: number;
        updates: Array<{ userId: number; status: "unmarked" | "attended" | "missed" }>;
      }
    >({
      query: ({ sessionId, updates }) => ({
        url: `/admin/scheduled-sessions/${sessionId}/attendance`,
        method: "POST",
        body: { updates },
      }),
      invalidatesTags: ["ScheduledSessions"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminGoogleCalendarConnectionQuery,
  useGetAdminGoogleCalendarOAuthStartQuery,
  useGetAdminGoogleCalendarsQuery,
  useSelectAdminGoogleCalendarMutation,
  useConnectAdminGoogleCalendarMutation,
  useDisconnectAdminGoogleCalendarMutation,
  useGetAdminSessionTemplatesQuery,
  useCreateAdminSessionTemplateMutation,
  useMaterializeAdminSessionTemplateMutation,
  useGetAdminScheduledSessionsQuery,
  useMarkAdminSessionAttendanceMutation,
} = adminSessionScheduleApi;
