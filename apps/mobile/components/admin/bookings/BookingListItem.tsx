import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ScaledText";
import { SmallAction } from "../AdminShared";
import { formatIsoShort } from "@/lib/admin-utils";

interface BookingListItemProps {
  booking: any;
  onPress: () => void;
  onUpdateStatus: (id: number, status: any) => void;
  isMutating: boolean;
  isDark: boolean;
}

export function BookingListItem({
  booking,
  onPress,
  onUpdateStatus,
  isMutating,
  isDark,
}: BookingListItemProps) {
  const bg = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: 18,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: bg,
          borderColor: borderColor,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View className="gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-[13px] font-clash font-bold text-app" numberOfLines={1}>
            #{booking.id} {booking.serviceName ?? "(service)"}
          </Text>
          <Text
            className="text-[11px] font-outfit text-secondary"
            style={{ fontVariant: ["tabular-nums"] }}
            numberOfLines={1}
          >
            {booking.status ?? "—"}
          </Text>
        </View>
        <Text className="text-[12px] font-outfit text-secondary" numberOfLines={1}>
          {booking.athleteName ?? "(athlete)"} • {formatIsoShort(booking.startsAt)}
        </Text>

        <View className="flex-row gap-2 mt-2">
          <SmallAction
            label="Confirm"
            tone="success"
            onPress={() => onUpdateStatus(booking.id, "confirmed")}
            disabled={isMutating}
          />
          <SmallAction
            label="Decline"
            tone="danger"
            onPress={() => onUpdateStatus(booking.id, "declined")}
            disabled={isMutating}
          />
          <SmallAction
            label="Cancel"
            tone="neutral"
            onPress={() => onUpdateStatus(booking.id, "cancelled")}
            disabled={isMutating}
          />
        </View>
      </View>
    </Pressable>
  );
}
