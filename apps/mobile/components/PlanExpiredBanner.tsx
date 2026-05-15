import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { AlertCircle } from "lucide-react-native";
import { View } from "react-native";

export function PlanExpiredBanner() {
  const programTier = useAppSelector((s) => s.user.programTier);
  const onboardingCompleted = useAppSelector((s) => s.user.onboardingCompleted);
  const apiUserRole = useAppSelector((s) => s.user.apiUserRole);
  const { isDark } = useAppTheme();

  const isExpired = onboardingCompleted === true && !programTier && !isAdminRole(apiUserRole);
  if (!isExpired) return null;

  const bg = isDark ? "hsl(28, 60%, 14%)" : "hsl(28, 90%, 95%)";
  const border = isDark ? "hsl(28, 55%, 30%)" : "hsl(28, 70%, 75%)";
  const iconColor = isDark ? "hsl(28, 80%, 65%)" : "hsl(28, 75%, 42%)";
  const textColor = isDark ? "hsl(28, 70%, 85%)" : "hsl(28, 60%, 25%)";
  const linkColor = isDark ? "hsl(28, 90%, 72%)" : "hsl(28, 80%, 35%)";

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
      <AlertCircle size={18} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: "Outfit-Medium", color: textColor, lineHeight: 18 }}>
          Your plan has expired. Please contact your coach to renew access.
        </Text>
      </View>
    </View>
  );
}
