import { apiSlice } from "../core";
import type {
  ApiPayload,
  BookingRecord,
  BookingStatus,
  BookingServiceRecord,
  BookingAvailabilityItem,
} from "../core";

const bookingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBookings: builder.query<
      { bookings: BookingRecord[] },
      { q?: string; limit?: number } | void
    >({
      query: (params) => {
        if (!params) return "/admin/bookings";
        const query = new URLSearchParams();
        if (params.q) query.set("q", params.q);
        if (params.limit) query.set("limit", String(params.limit));
        const queryString = query.toString();
        return queryString
          ? `/admin/bookings?${queryString}`
          : "/admin/bookings";
      },
      providesTags: ["Bookings"],
    }),
    getBookingById: builder.query<{ booking: BookingRecord }, number>({
      query: (bookingId) => `/admin/bookings/${bookingId}`,
      providesTags: ["Bookings"],
    }),
    getUserBookings: builder.query<{ items: BookingRecord[] }, void>({
      query: () => "/bookings",
      providesTags: ["Bookings"],
    }),
    updateBookingStatus: builder.mutation<
      { booking?: BookingRecord; status?: BookingStatus },
      {
        bookingId: number;
        status: string;
        startsAt?: string;
        endTime?: string | null;
        location?: string | null;
        meetingLink?: string | null;
      }
    >({
      query: ({ bookingId, status, startsAt, endTime, location, meetingLink }) => ({
        url: `/admin/bookings/${bookingId}`,
        method: "PATCH",
        body: {
          status,
          ...(startsAt !== undefined ? { startsAt } : {}),
          ...(endTime !== undefined ? { endTime } : {}),
          ...(location !== undefined ? { location } : {}),
          ...(meetingLink !== undefined ? { meetingLink } : {}),
        },
      }),
      invalidatesTags: ["Bookings"],
    }),
    createAdminBooking: builder.mutation<
      { booking?: BookingRecord; id?: number; message?: string },
      {
        userId: number;
        serviceTypeId: number;
        startsAt: string;
        endsAt: string;
        location?: string | null;
        meetingLink?: string | null;
        status?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bookings"],
    }),
    getAdminAvailability: builder.query<{ items: any[] }, void>({
      query: () => "/admin/availability",
      providesTags: ["Availability"],
    }),
    getServices: builder.query<{ items: BookingServiceRecord[] }, void>({
      query: () => "/bookings/services?includeInactive=true",
      providesTags: ["Services"],
      keepUnusedDataFor: 600,
    }),
    getBookingServices: builder.query<{ items: BookingServiceRecord[] }, void>({
      query: () => "/bookings/services",
      providesTags: ["Services"],
      keepUnusedDataFor: 600,
    }),
    getBookingAvailability: builder.query<
      {
        items: BookingAvailabilityItem[];
        bookings?: BookingRecord[];
        slots?: string[];
      },
      { serviceTypeId: number; from: string; to: string }
    >({
      query: ({ serviceTypeId, from, to }) => {
        const query = new URLSearchParams();
        query.set("serviceTypeId", String(serviceTypeId));
        query.set("from", from);
        query.set("to", to);
        return `/bookings/availability?${query.toString()}`;
      },
      providesTags: ["Availability"],
    }),
    getGeneratedBookingAvailability: builder.query<
      { items: BookingAvailabilityItem[] },
      { from: string; to: string; serviceTypeId?: number }
    >({
      query: ({ from, to, serviceTypeId }) => {
        const query = new URLSearchParams();
        query.set("from", from);
        query.set("to", to);
        if (serviceTypeId != null)
          query.set("serviceTypeId", String(serviceTypeId));
        return `/bookings/generated-availability?${query.toString()}`;
      },
      providesTags: ["Availability"],
    }),
    createBooking: builder.mutation<
      { booking?: BookingRecord; id?: number; message?: string },
      {
        serviceTypeId: number;
        startsAt?: string;
        endsAt?: string;
        occurrenceKey?: string;
        slotKey?: string;
        location?: string;
        meetingLink?: string;
        timezoneOffsetMinutes?: number;
      }
    >({
      query: (body) => ({
        url: "/bookings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bookings"],
    }),
    cancelBooking: builder.mutation<{ booking: BookingRecord }, number>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Bookings"],
    }),
    createService: builder.mutation<any, ApiPayload>({
      query: (body) => ({
        url: "/bookings/services",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Services", "Bookings"],
    }),
    updateService: builder.mutation<any, { id: number; data: ApiPayload }>({
      query: ({ id, data }) => ({
        url: `/bookings/services/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Services", "Bookings"],
    }),
    deleteService: builder.mutation<{ deleted: unknown }, number>({
      query: (id) => ({
        url: `/bookings/services/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Services", "Bookings", "Availability"],
    }),
    createAvailability: builder.mutation<any, ApiPayload>({
      query: (body) => ({
        url: "/bookings/availability",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Availability"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useGetUserBookingsQuery,
  useUpdateBookingStatusMutation,
  useCreateAdminBookingMutation,
  useGetAdminAvailabilityQuery,
  useGetServicesQuery,
  useGetBookingServicesQuery,
  useGetBookingAvailabilityQuery,
  useGetGeneratedBookingAvailabilityQuery,
  useCreateBookingMutation,
  useCancelBookingMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useCreateAvailabilityMutation,
} = bookingsApi;
