import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { formatIsoShort } from "@/lib/admin-utils";
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
  const { colors } = useAppTheme();
  
  const statusColor = 
    booking.status === "confirmed" ? "#22C55E" :
    booking.status === "pending" ? "#F59E0B" :
    booking.status === "cancelled" ? "#EF4444" :
    colors.textSecondary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="rounded-[32px] border p-6"
      style={{
        backgroundColor: isDark ? colors.cardElevated : colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.md)
      }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
          <Text className="text-[10px] font-outfit-bold text-accent uppercase tracking-widest">
            {booking.serviceType?.replace(/_/g, ' ') || "Session"}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          <Text className="text-[10px] font-outfit-bold uppercase tracking-widest" style={{ color: statusColor }}>
            {booking.status || "Pending"}
          </Text>
        </View>
      </View>

      <Text className="text-xl font-clash font-bold text-app mb-1" numberOfLines={1}>
        {booking.serviceName}
      </Text>
      
      <View className="flex-row items-center gap-2 mb-6">
        <Text className="text-[15px] font-outfit-bold text-app">{booking.athleteName}</Text>
        <Text className="text-sm font-outfit text-textSecondary">•</Text>
        <Text className="text-sm font-outfit text-textSecondary">
          {new Date(booking.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View className="flex-row gap-3 pt-5 border-t border-app/5">
        {booking.status === "pending" && (
          <TouchableOpacity 
            onPress={() => onUpdateStatus(booking.id, "confirmed")}
            disabled={isMutating}
            className="flex-1 h-11 rounded-xl bg-success/10 items-center justify-center flex-row gap-2 border border-success/20"
          >
            <Feather name="check" size={14} color="#22C55E" />
            <Text className="text-xs font-outfit-bold text-success uppercase">Confirm</Text>
          </TouchableOpacity>
        )}
        
        {booking.status !== "cancelled" && (
          <TouchableOpacity 
            onPress={() => onUpdateStatus(booking.id, "cancelled")}
            disabled={isMutating}
            className="flex-1 h-11 rounded-xl bg-red-500/10 items-center justify-center flex-row gap-2 border border-red-500/20"
          >
            <Feather name="x" size={14} color="#EF4444" />
            <Text className="text-xs font-outfit-bold text-red-400 uppercase">Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          onPress={onPress}
          className="h-11 w-11 rounded-xl bg-secondary/10 items-center justify-center border border-app/5"
        >
          <Feather name="eye" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
