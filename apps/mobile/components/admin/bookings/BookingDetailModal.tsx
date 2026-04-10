import React from "react";
import { View, Modal, Platform } from "react-native";
import { Text } from "@/components/ScaledText";
import { SmallAction } from "../AdminShared";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Skeleton } from "@/components/Skeleton";
import { Shadows } from "@/constants/theme";
import { formatIsoShort } from "@/lib/admin-utils";

interface BookingDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  booking: any;
  detail: any;
  isLoading: boolean;
  onUpdateStatus: (id: number, status: any) => void;
  isMutating: boolean;
  colors: any;
  isDark: boolean;
  insetsTop: number;
}

export function BookingDetailModal({
  isVisible,
  onClose,
  booking,
  detail,
  isLoading,
  onUpdateStatus,
  isMutating,
  colors,
  isDark,
  insetsTop,
}: BookingDetailModalProps) {
  const cardBg = isDark ? colors.cardElevated : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const mutedBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
  const mutedBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insetsTop }}>
        <View className="px-4 pb-3 flex-row items-center justify-between gap-3">
          <View style={{ flex: 1 }}>
            <Text className="text-[18px] font-clash font-bold text-app" numberOfLines={1}>
              Booking #{booking?.id ?? ""}
            </Text>
            <Text className="text-[12px] font-outfit text-secondary">Details and actions</Text>
          </View>
          <SmallAction label="Done" tone="neutral" onPress={onClose} />
        </View>

        <ThemedScrollView>
          <View className="gap-4 p-4">
            <View
              className="rounded-[20px] border p-4"
              style={{
                backgroundColor: cardBg,
                borderColor: cardBorder,
                ...(isDark ? Shadows.none : Shadows.md),
              }}
            >
              <View className="gap-1">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-[14px] font-clash font-bold text-app" numberOfLines={1}>
                    {booking?.serviceName ?? "(service)"}
                  </Text>
                  <Text className="text-[12px] font-outfit text-secondary">
                    {detail?.status ?? booking?.status ?? "—"}
                  </Text>
                </View>
                <Text className="text-[12px] font-outfit text-secondary" numberOfLines={2}>
                  {booking?.athleteName ?? "(athlete)"} • {formatIsoShort(booking?.startsAt)}
                </Text>
              </View>

              <View className="flex-row gap-2 mt-3">
                <SmallAction
                  label="Confirm"
                  tone="success"
                  onPress={() => booking && onUpdateStatus(booking.id, "confirmed")}
                  disabled={isMutating}
                />
                <SmallAction
                  label="Decline"
                  tone="danger"
                  onPress={() => booking && onUpdateStatus(booking.id, "declined")}
                  disabled={isMutating}
                />
                <SmallAction
                  label="Cancel"
                  tone="neutral"
                  onPress={() => booking && onUpdateStatus(booking.id, "cancelled")}
                  disabled={isMutating}
                />
              </View>
            </View>

            <View
              className="rounded-[20px] border p-4"
              style={{ backgroundColor: mutedBg, borderColor: mutedBorder }}
            >
              {isLoading ? (
                <View className="gap-2">
                  <Skeleton width="82%" height={12} />
                  <Skeleton width="88%" height={12} />
                  <Skeleton width="76%" height={12} />
                </View>
              ) : detail ? (
                <View className="gap-2">
                  <Text selectable className="text-[12px] font-outfit text-secondary">
                    Guardian: {detail.guardianName ?? "—"} • {detail.guardianEmail ?? "—"}
                  </Text>
                  <Text selectable className="text-[12px] font-outfit text-secondary">
                    Window: {formatIsoShort(detail.startsAt)} → {formatIsoShort(detail.endTime)}
                  </Text>
                  {detail.slotsTotal != null && (
                    <Text selectable className="text-[12px] font-outfit text-secondary">
                      Capacity: {detail.slotsUsed ?? 0}/{detail.slotsTotal}
                    </Text>
                  )}
                  {detail.location && (
                    <Text selectable className="text-[12px] font-outfit text-secondary">
                      Location: {detail.location}
                    </Text>
                  )}
                  {detail.meetingLink && (
                    <Text selectable className="text-[12px] font-outfit text-secondary">
                      Meeting: {detail.meetingLink}
                    </Text>
                  )}
                  {detail.createdAt && (
                    <Text selectable className="text-[11px] font-outfit text-secondary">
                      Created {formatIsoShort(detail.createdAt)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text className="text-[12px] font-outfit text-secondary">No detail loaded.</Text>
              )}
            </View>
          </View>
        </ThemedScrollView>
      </View>
    </Modal>
  );
}
