import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Text } from "@/components/ScaledText";
import { Skeleton } from "@/components/Skeleton";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { ServiceType, type AdminBooking } from "@/types/admin";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Calendar, ChevronDown } from "lucide-react-native";

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
  const p = useAdminPastel();
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
    return bookingsHook.bookings.filter((b) => {
      const type = b.serviceType ?? b.type ?? "";
      if (activeChip === "All") return true;
      if (activeChip === "Group")
        return ["group_call", "semi_private"].includes(type);
      if (activeChip === "Individual")
        return ["individual_call", "one_on_one", "one_to_one"].includes(type);
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
    <View style={{ paddingHorizontal: 24, paddingBottom: 160 }}>
      {/* Book for a client */}
      <View style={{ marginBottom: 40 }}>
        <Text
          style={{
            fontSize: 24,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            marginBottom: 8,
          }}
        >
          Book for a client
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Outfit-Regular",
            color: p.textSecondary,
            marginBottom: 24,
          }}
        >
          Place a booking as admin (bypasses availability if needed).
        </Text>
        <TouchableOpacity
          onPress={() => create.setOpen(true)}
          activeOpacity={0.8}
          style={{
            height: 56,
            borderRadius: 100,
            backgroundColor: p.accent,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 24,
          }}
        >
          <Calendar size={18} color="#FFFFFF" />
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            Create booking
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ marginBottom: 32, gap: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: "Outfit-Bold",
              color: p.textPrimary,
            }}
          >
            Upcoming
          </Text>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 100,
              backgroundColor: p.accentSoft,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Outfit-Bold",
                color: p.accent,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              {upcomingBookings.length} Bookings
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {chips.map((chip) => {
              const isActive = activeChip === chip;
              return (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setActiveChip(chip)}
                  style={{
                    height: 40,
                    paddingHorizontal: 16,
                    borderRadius: 100,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isActive ? p.accent : p.cardWhite,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Outfit-Bold",
                      color: isActive ? "#FFFFFF" : p.textSecondary,
                    }}
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
        <View style={{ gap: 16, marginBottom: 40 }}>
          <Skeleton width="100%" height={120} borderRadius={28} />
          <Skeleton width="100%" height={120} borderRadius={28} />
        </View>
      ) : upcomingBookings.length === 0 ? (
        <View
          style={{
            paddingVertical: 48,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: p.textMuted,
            borderRadius: 28,
            marginBottom: 40,
          }}
        >
          <Text
            style={{
              color: p.textMuted,
              fontFamily: "Outfit-Regular",
              fontStyle: "italic",
            }}
          >
            No upcoming bookings found.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16, marginBottom: 48 }}>
          {upcomingBookings.map((b) => (
            <BookingListItem
              key={String(b.id)}
              booking={b}
              isDark={false}
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
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            marginBottom: 8,
          }}
        >
          Past Bookings
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Outfit-Regular",
            color: p.textSecondary,
          }}
        >
          Completed sessions for the selected criteria.
        </Text>
      </View>

      {pastBookings.length === 0 ? (
        <View
          style={{
            paddingVertical: 32,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: p.textMuted,
            borderRadius: 28,
          }}
        >
          <Text
            style={{
              color: p.textMuted,
              fontFamily: "Outfit-Regular",
              fontStyle: "italic",
            }}
          >
            No past bookings.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {pastBookings.slice(0, 10).map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => detail.setOpenId(b.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderRadius: 28,
                backgroundColor: p.cardSage,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    color: p.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {b.serviceName}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {b.athleteName} •{" "}
                  {b.startsAt
                    ? new Date(b.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </Text>
              </View>
              <View
                style={{
                  height: 32,
                  paddingHorizontal: 16,
                  borderRadius: 100,
                  backgroundColor: p.accentSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Outfit-Bold",
                    color: p.accent,
                    textTransform: "uppercase",
                  }}
                >
                  View
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Cancelled / Declined */}
      <View style={{ marginTop: 40, marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
            marginBottom: 8,
          }}
        >
          Cancelled
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Outfit-Regular",
            color: p.textSecondary,
          }}
        >
          Declined and cancelled bookings.
        </Text>
      </View>

      {cancelledBookings.length === 0 ? (
        <View
          style={{
            paddingVertical: 32,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: p.textMuted,
            borderRadius: 28,
          }}
        >
          <Text
            style={{
              color: p.textMuted,
              fontFamily: "Outfit-Regular",
              fontStyle: "italic",
            }}
          >
            No cancelled bookings.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {cancelledBookings.slice(0, 10).map((b) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => detail.setOpenId(b.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 20,
                borderRadius: 28,
                backgroundColor: p.dangerSoft,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Outfit-Bold",
                    color: p.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {b.serviceName}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Outfit-Regular",
                    color: p.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {b.athleteName} • {b.status}
                </Text>
              </View>
              <View
                style={{
                  height: 32,
                  paddingHorizontal: 16,
                  borderRadius: 100,
                  backgroundColor: p.danger,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Outfit-Bold",
                    color: "#FFFFFF",
                    textTransform: "uppercase",
                  }}
                >
                  View
                </Text>
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
        colors={p as any}
        isDark={false}
        insetsTop={insets.top}
      />

      <BookingDetailModal
        isVisible={detail.openId != null}
        onClose={() => detail.setOpenId(null)}
        booking={bookingsHook.bookings.find((x) => x.id === detail.openId)}
        detail={
          detail.openId ? bookingsHook.bookingDetails[detail.openId] : null
        }
        isLoading={
          detail.openId
            ? Boolean(bookingsHook.bookingDetailLoadingIds[detail.openId])
            : false
        }
        onUpdateStatus={handleUpdateStatus}
        isMutating={bookingsHook.bookingMutatingId === detail.openId}
        colors={p as any}
        isDark={false}
        insetsTop={insets.top}
      />
    </View>
  );
}

function FilterChip({ label, options, onSelect }: any) {
  const p = useAdminPastel();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          paddingHorizontal: 16,
          height: 40,
          borderRadius: 100,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: p.cardWhite,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
          }}
        >
          {label}
        </Text>
        <ChevronDown size={14} color={p.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: p.overlay,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: p.cardWhite,
            }}
          >
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((opt: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: i < options.length - 1 ? 1 : 0,
                    borderBottomColor: p.divider,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily:
                        opt === label ? "Outfit-Bold" : "Outfit-Regular",
                      color: opt === label ? p.accent : p.textPrimary,
                    }}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
