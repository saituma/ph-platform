import { apiSlice } from "../core";

const nutritionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNutritionTargets: builder.query<{ targets: any }, number>({
      query: (userId) => `/nutrition/targets/${userId}`,
      providesTags: ["FoodDiary"],
    }),
    updateNutritionTargets: builder.mutation<{ targets: any }, { userId: number; calories?: number; protein?: number; carbs?: number; fats?: number; micronutrientsGuidance?: string }>({
      query: ({ userId, ...body }) => ({
        url: `/nutrition/targets/${userId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FoodDiary"],
    }),
    getNutritionLogs: builder.query<
      { logs: any[] },
      { userId: number; limit?: number; from?: string; to?: string }
    >({
      query: (params) => {
        const query = new URLSearchParams();
        query.set("userId", String(params.userId));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.from) query.set("from", String(params.from));
        if (params.to) query.set("to", String(params.to));
        return `/nutrition/logs?${query.toString()}`;
      },
      providesTags: ["FoodDiary"],
    }),
    reviewNutritionLog: builder.mutation<{ log: any }, { logId: number; feedback: string }>({
      query: ({ logId, feedback }) => ({
        url: `/nutrition/logs/${logId}/feedback`,
        method: "POST",
        body: { feedback },
      }),
      invalidatesTags: ["FoodDiary"],
    }),
    getFoodDiary: builder.query<
      { items: any[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/food-diary";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString
          ? `/admin/food-diary?${queryString}`
          : "/admin/food-diary";
      },
      providesTags: ["FoodDiary"],
    }),
    reviewFoodDiary: builder.mutation<
      { item: any },
      { entryId: number; feedback?: string | null }
    >({
      query: ({ entryId, feedback }) => ({
        url: `/admin/food-diary/${entryId}/review`,
        method: "POST",
        body: feedback === undefined ? {} : { feedback },
      }),
      invalidatesTags: ["FoodDiary"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNutritionTargetsQuery,
  useUpdateNutritionTargetsMutation,
  useGetNutritionLogsQuery,
  useReviewNutritionLogMutation,
  useGetFoodDiaryQuery,
  useReviewFoodDiaryMutation,
} = nutritionApi;
