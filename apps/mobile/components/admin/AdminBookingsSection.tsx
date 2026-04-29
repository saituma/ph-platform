import React, { useMemo, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, Modal, Pressable } from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ServiceType, type AdminBooking } from "@/types/admin";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Feather } from "@/components/ui/theme-icons";
import { Shadows } from "@/constants/theme";
import { formatIsoShort } from "@/lib/admin-utils";

import { useAdminBookingsController } from "../../hooks/admin/controllers/useAdminBookingsController";
import { BookingListItem } from "./bookings/BookingListItem";
import { CreateBookingModal } from "./bookings/CreateBookingModal";
import { BookingDetailModal } from "./bookings/BookingDetailModal";
function bookingStartMs(b: AdminBooking): number {
  const s = b.startsAt;
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

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
  const insets = useAppSafeAreaInsets();

  const {
    bookingsHook,
    search,
    detail,
    create,
    handleUpdateStatus,
  } = useAdminBookingsController(token, canLoad, services, initialAction);

  const [activeChip, setActiveChip] = useState("All");
  const chips = ["All", "Group", "Individual", "Lift Lab", "Premium"];

  const filteredBookings = useMemo(() => {
    return bookingsHook.bookings.filter(b => {
      const type = b.serviceType ?? b.type ?? "";
      if (activeChip === "All") return true;
      if (activeChip === "Group") return ["group_call", "semi_private"].includes(type);
      if (activeChip === "Individual") return ["individual_call", "one_on_one", "one_to_one"].includes(type);
      if (activeChip === "Lift Lab") return type === "lift_lab_1on1";
      if (activeChip === "Premium") return type === "role_model";
      return true;
    });
  }, [activeChip, bookingsHook.bookings]);

  const upcomingBookings = useMemo(() => {
    const now = Date.now();
    return filteredBookings
      .filter((b) => {
        const status = b.status?.toLowerCase();
        if (status === "cancelled" || status === "declined") return false;
        const ms = bookingStartMs(b);
        return ms === 0 || ms >= now;
      })
      .sort((a, b) => bookingStartMs(a) - bookingStartMs(b));
  }, [filteredBookings]);

  const pastBookings = useMemo(() => {
    const now = Date.now();
    return filteredBookings
      .filter((b) => {
        const status = b.status?.toLowerCase();
        if (status === "cancelled" || status === "declined") return false;
        const ms = bookingStartMs(b);
        return ms > 0 && ms < now;
      })
      .sort((a, b) => bookingStartMs(b) - bookingStartMs(a));
  }, [filteredBookings]);

  const cancelledBookings = useMemo(() => {
    return filteredBookings.filter((b) => {
      const status = b.status?.toLowerCase();
      return status === "cancelled" || status === "declined";
    });
  }, [filteredBookings]);

  return (
    <View className="px-6 pb-40">
      {/* Book for a client */}
      <View className="mb-10">
        <Text className="text-2xl font-clash font-bold text-app mb-2">Book for a client</Text>
        <Text className="text-sm font-outfit text-textSecondary mb-6">
          Place a booking as admin (bypasses availability if needed).
        </Text>
        <TouchableOpacity
          onPress={() => create.setOpen(true)}
          activeOpacity={0.8}
          className="h-14 rounded-[18px] bg-[#22C55E] flex-row items-center justify-center gap-2 px-6 shadow-sm"
        >
          <Feather name="calendar" size={18} color="#FFFFFF" />
          <Text className="font-outfit-bold text-white uppercase tracking-wider">Create booking</Text>
        </TouchableOpacity>
      </View>

      {/* Filters (Like Web) */}
      <View className="mb-8 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-clash font-bold text-app">Upcoming</Text>
          <View className="px-3 py-1 rounded-full bg-accent/10">
            <Text className="text-[10px] font-outfit-bold text-accent uppercase tracking-widest">
              {upcomingBookings.length} Bookings
            </Text>
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {chips.map((chip) => {
              const isActive = activeChip === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setActiveChip(chip)}
                  className="h-10 px-4 rounded-full border items-center justify-center"
                  style={{
                    backgroundColor: isActive ? colors.accent : isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
                    borderColor: isActive ? colors.accent : isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
                  }}
                >
                  <Text
                    className="text-xs font-outfit-bold"
                    style={{ color: isActive ? colors.textInverse : colors.textSecondary }}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Upcoming List */}
      {bookingsHook.bookingsLoading && bookingsHook.bookings.length === 0 ? (
        <View className="gap-4 mb-10">
          <Skeleton width="100%" height={120} borderRadius={32} />
          <Skeleton width="100%" height={120} borderRadius={32} />
        </View>
      ) : upcomingBookings.length === 0 ? (
        <View className="py-12 items-center justify-center border border-dashed border-app/20 rounded-[32px] mb-10">
          <Text className="text-textSecondary font-outfit italic">No upcoming bookings found.</Text>
        </View>
      ) : (
        <View className="gap-4 mb-12">
          {upcomingBookings.map((b) => (
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

      {/* Past Bookings */}
      <View className="mb-6">
        <Text className="text-xl font-clash font-bold text-app mb-2">Past Bookings</Text>
        <Text className="text-sm font-outfit text-textSecondary">Completed sessions for the selected criteria.</Text>
      </View>

      {pastBookings.length === 0 ? (
        <View className="py-8 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
          <Text className="text-textSecondary font-outfit italic">No past bookings.</Text>
        </View>
      ) : (
        <View className="gap-3">
          {pastBookings.slice(0, 10).map((b) => (
            <TouchableOpacity 
              key={b.id}
              onPress={() => detail.setOpenId(b.id)}
              className="flex-row items-center justify-between p-5 rounded-2xl bg-secondary/5 border border-app/5"
            >
              <View className="flex-1">
                <Text className="font-outfit-bold text-app" numberOfLines={1}>{b.serviceName}</Text>
                <Text className="text-xs font-outfit text-textSecondary mt-0.5">
                  {b.athleteName} •{" "}
                  {b.startsAt
                    ? new Date(b.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </Text>
              </View>
              <View className="h-8 px-4 rounded-lg bg-secondary/10 items-center justify-center">
                <Text className="text-[10px] font-outfit-bold text-app uppercase">View</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Cancelled / Declined */}
      <View className="mt-10 mb-6">
        <Text className="text-xl font-clash font-bold text-app mb-2">Cancelled</Text>
        <Text className="text-sm font-outfit text-textSecondary">Declined and cancelled bookings.</Text>
      </View>

      {cancelledBookings.length === 0 ? (
        <View className="py-8 items-center justify-center border border-dashed border-app/20 rounded-[32px]">
          <Text className="text-textSecondary font-outfit italic">No cancelled bookings.</Text>
        </View>
      ) : (
        <View className="gap-3">
          {cancelledBookings.slice(0, 10).map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => detail.setOpenId(b.id)}
              className="flex-row items-center justify-between p-5 rounded-2xl bg-red-500/5 border border-red-500/10"
            >
              <View className="flex-1">
                <Text className="font-outfit-bold text-app" numberOfLines={1}>{b.serviceName}</Text>
                <Text className="text-xs font-outfit text-textSecondary mt-0.5">
                  {b.athleteName} • {b.status}
                </Text>
              </View>
              <View className="h-8 px-4 rounded-lg bg-red-500/10 items-center justify-center">
                <Text className="text-[10px] font-outfit-bold text-red-400 uppercase">View</Text>
              </View>
            </TouchableOpacity>
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
        isBusy={bookingsHook.createBookingBusy}
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

function FilterChip({ label, options, onSelect }: any) {
  const { colors, isDark } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setOpen(true)}
        className="px-4 h-10 rounded-full border flex-row items-center gap-2"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
        }}
      >
        <Text className="text-xs font-outfit-bold text-app">{label}</Text>
        <Feather name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/60 items-center justify-center p-6" onPress={() => setOpen(false)}>
          <View className="w-full max-w-xs rounded-[28px] overflow-hidden" style={{ backgroundColor: isDark ? "#161628" : "#FFFFFF" }}>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((opt: any, i: number) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => { onSelect(opt); setOpen(false); }}
                  className="px-6 py-4 border-b border-app/5 last:border-0"
                >
                  <Text className={`text-sm ${opt === label ? 'font-outfit-bold text-accent' : 'font-outfit text-app'}`}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
