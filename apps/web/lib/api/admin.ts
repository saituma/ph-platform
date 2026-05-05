import { apiSlice } from "../core";
import type { AdminProfileResponse, ApiPayload, DashboardResponse } from "../core";

const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminProfile: builder.query<AdminProfileResponse, void>({
      query: () => "/admin/profile",
      providesTags: ["Content"],
      keepUnusedDataFor: 600,
    }),
    updateAdminProfile: builder.mutation<AdminProfileResponse, ApiPayload>({
      query: (body) => ({
        url: "/admin/profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    updateAdminPreferences: builder.mutation<AdminProfileResponse, ApiPayload>({
      query: (body) => ({
        url: "/admin/preferences",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Content"],
    }),
    updateMessagingAccess: builder.mutation<
      { messagingAccessTiers: string[] },
      { tiers: string[] }
    >({
      query: (body) => ({
        url: "/admin/messaging-access",
        method: "PUT",
        body,
      }),
    }),
    changePassword: builder.mutation<
      any,
      { oldPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
    }),
    submitAppFeedback: builder.mutation<
      { ok: boolean },
      { category: string; message: string }
    >({
      query: (body) => ({
        url: "/support/app-feedback",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Threads"],
    }),
    getDashboard: builder.query<DashboardResponse, void>({
      query: () => "/admin/dashboard",
      providesTags: ["Dashboard"],
    }),
    getOnboardingConfig: builder.query<{ config: any }, void>({
      query: () => "/admin/onboarding-config",
      providesTags: ["OnboardingConfig"],
    }),
    getPhpPlusTabs: builder.query<{ tabs: string[] }, void>({
      query: () => "/admin/php-plus-tabs",
    }),
    updateOnboardingConfig: builder.mutation<{ config: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/onboarding-config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["OnboardingConfig"],
    }),
    updatePhpPlusTabs: builder.mutation<{ config: any }, { tabs: string[] }>({
      query: (body) => ({
        url: "/admin/php-plus-tabs",
        method: "PUT",
        body,
      }),
    }),
    getPortalConfig: builder.query<{ config: any }, void>({
      query: () => "/admin/portal-config",
      providesTags: ["PortalConfig"],
    }),
    getAppFeedback: builder.query<
      {
        items: Array<{
          id: number;
          senderId: number;
          senderName: string;
          senderEmail: string;
          category: string;
          message: string;
          createdAt: string;
        }>;
      },
      void
    >({
      query: () => "/admin/app-feedback",
    }),
    updatePortalConfig: builder.mutation<{ config: any }, ApiPayload>({
      query: (body) => ({
        url: "/admin/portal-config",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PortalConfig"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminProfileQuery,
  useUpdateAdminProfileMutation,
  useUpdateAdminPreferencesMutation,
  useUpdateMessagingAccessMutation,
  useChangePasswordMutation,
  useSubmitAppFeedbackMutation,
  useGetDashboardQuery,
  useGetOnboardingConfigQuery,
  useUpdateOnboardingConfigMutation,
  useGetPhpPlusTabsQuery,
  useUpdatePhpPlusTabsMutation,
  useGetPortalConfigQuery,
  useGetAppFeedbackQuery,
  useUpdatePortalConfigMutation,
} = adminApi;
