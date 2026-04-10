import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { SmallAction } from "./AdminShared";
import { ServiceType } from "@/types/admin";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAdminBookingsController } from "../../hooks/admin/controllers/useAdminBookingsController";
import { BookingSearchForm } from "./bookings/BookingSearchForm";
import { BookingListItem } from "./bookings/BookingListItem";
import { CreateBookingModal } from "./bookings/CreateBookingModal";
import { BookingDetailModal } from "./bookings/BookingDetailModal";

interface Props {
  token: string | null;
  canLoad: boolean;
  services: ServiceType[];
  initialAction?: "createBooking" | null;
}

export function AdminBookingsSection({
  token,
  canLoad,
  services,
  initialAction,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    bookingsHook,
    search,
    detail,
    create,
    handleUpdateStatus,
  } = useAdminBookingsController(token, canLoad, services, initialAction);

  return (
    <View className="gap-4">
      {/* Create Trigger */}
      <View className="gap-2">
        <Text className="text-[13px] font-outfit-semibold text-app">
          Create booking
        </Text>
        <View className="flex-row gap-2">
          <SmallAction
            label="New booking"
            tone="success"
            onPress={() => create.setOpen(true)}
            disabled={bookingsHook.createBookingBusy}
          />
        </View>
        <Text className="text-[12px] font-outfit text-secondary">
          Places a booking for a client as admin/coach (defaults to confirmed).
        </Text>
      </View>

      {/* Search Form */}
      <BookingSearchForm
        query={search.query}
        setQuery={search.setQuery}
        limit={search.limit}
        setLimit={search.setLimit}
        onRun={() =>
          bookingsHook.loadBookings(search.query, search.limit, true)
        }
        onReset={() => {
          search.setQuery("");
          search.setLimit("50");
          bookingsHook.loadBookings("", "50", true);
        }}
        isLoading={bookingsHook.bookingsLoading}
        colors={colors}
        isDark={isDark}
      />

      {/* List */}
      {bookingsHook.bookingsLoading && bookingsHook.bookings.length === 0 ? (
        <View className="gap-2">
          <Skeleton width="92%" height={14} />
          <Skeleton width="86%" height={14} />
          <Skeleton width="90%" height={14} />
        </View>
      ) : bookingsHook.bookingsError ? (
        <Text selectable className="text-sm font-outfit text-red-400">
          {bookingsHook.bookingsError}
        </Text>
      ) : bookingsHook.bookings.length === 0 ? (
        <Text className="text-sm font-outfit text-secondary">
          No bookings found.
        </Text>
      ) : (
        <View className="gap-3">
          {bookingsHook.bookings.map((b) => (
            <BookingListItem
              key={String(b.id)}
              booking={b}
              isDark={isDark}
              isMutating={bookingsHook.bookingMutatingId === b.id}
              onPress={() => {
                detail.setOpenId(b.id);
                if (!bookingsHook.bookingDetails[b.id]) {
                  bookingsHook.loadBookingDetail(b.id, false);
                }
              }}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </View>
      )}

      {/* Modals */}
      <CreateBookingModal
        isVisible={create.isOpen}
        onClose={() => create.setOpen(false)}
        form={create}
        services={services}
        users={bookingsHook.createBookingUsers}
        onSearchUsers={() => bookingsHook.searchUsers(create.userQuery, true)}
        colors={colors}
        isDark={isDark}
        insetsTop={insets.top}
      />

      <BookingDetailModal
        isVisible={detail.openId != null}
        onClose={() => detail.setOpenId(null)}
        booking={bookingsHook.bookings.find((x) => x.id === detail.openId)}
        detail={detail.openId ? bookingsHook.bookingDetails[detail.openId] : null}
        isLoading={detail.openId ? Boolean(bookingsHook.bookingDetailLoadingIds[detail.openId]) : false}
        onUpdateStatus={handleUpdateStatus}
        isMutating={bookingsHook.bookingMutatingId === detail.openId}
        colors={colors}
        isDark={isDark}
        insetsTop={insets.top}
      />
    </View>
  );
}
