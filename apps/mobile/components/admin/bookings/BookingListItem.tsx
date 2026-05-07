import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Feather } from "@/components/ui/theme-icons";

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
  const p = useAdminPastel();
  
  const statusColor =
    booking.status === "confirmed" ? p.success :
    booking.status === "pending" ? p.warning :
    booking.status === "cancelled" ? p.danger :
    p.textSecondary;

  const cardBg =
    booking.status === "pending" ? p.cardYellow :
    booking.status === "confirmed" ? p.cardMint :
    booking.status === "cancelled" ? p.dangerSoft :
    p.cardSage;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        borderRadius: 28,
        padding: 18,
        backgroundColor: cardBg,
        shadowColor: p.shadow,
        shadowOpacity: 1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: isDark ? 0 : 3,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 100,
            backgroundColor: p.cardWhite,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontFamily: "Outfit-Bold",
              color: p.accent,
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            {booking.serviceType?.replace(/_/g, ' ') || "Session"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ height: 7, width: 7, borderRadius: 4, backgroundColor: statusColor }} />
          <Text
            style={{
              fontSize: 10,
              fontFamily: "Outfit-Bold",
              color: statusColor,
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            {booking.status || "Pending"}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 19,
          color: p.textPrimary,
          letterSpacing: -0.3,
          marginBottom: 6,
        }}
        numberOfLines={1}
      >
        {booking.serviceName}
      </Text>
      
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Outfit-Bold",
            color: p.textPrimary,
          }}
          numberOfLines={1}
        >
          {booking.athleteName}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>•</Text>
        <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
          {new Date(booking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: p.divider,
        }}
      >
        {booking.status === "pending" && (
          <TouchableOpacity 
            onPress={() => onUpdateStatus(booking.id, "confirmed")}
            disabled={isMutating}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 14,
              backgroundColor: p.successSoft,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: isMutating ? 0.6 : 1,
            }}
          >
            <Feather name="check" size={14} color={p.success} />
            <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.success, textTransform: "uppercase" }}>
              Confirm
            </Text>
          </TouchableOpacity>
        )}
        
        {booking.status !== "cancelled" && (
          <TouchableOpacity 
            onPress={() => onUpdateStatus(booking.id, "cancelled")}
            disabled={isMutating}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 14,
              backgroundColor: p.dangerSoft,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: isMutating ? 0.6 : 1,
            }}
          >
            <Feather name="x" size={14} color={p.danger} />
            <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.danger, textTransform: "uppercase" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={onPress}
          style={{
            height: 42,
            width: 42,
            borderRadius: 14,
            backgroundColor: p.cardWhite,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="eye" size={16} color={p.textPrimary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
