import { View } from "react-native";
import { WifiOff } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  const { isDark } = useAppTheme();

  if (isOnline) return null;

  const bg = isDark ? "hsl(0, 55%, 16%)" : "hsl(0, 85%, 96%)";
  const border = isDark ? "hsl(0, 50%, 30%)" : "hsl(0, 70%, 80%)";
  const iconColor = isDark ? "hsl(0, 75%, 68%)" : "hsl(0, 70%, 45%)";
  const textColor = isDark ? "hsl(0, 65%, 88%)" : "hsl(0, 55%, 30%)";

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginTop: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
      }}
    >
      <WifiOff size={18} color={iconColor} />
      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Outfit-Medium", color: textColor, lineHeight: 18 }}>
        You&apos;re offline — runs and messages won&apos;t sync until you reconnect.
      </Text>
    </View>
  );
}
