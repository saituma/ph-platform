import { Linking, Pressable, View } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { isAdminRole } from "@/lib/isAdminRole";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { AlertCircle, ArrowRight } from "lucide-react-native";

export function PlanExpiredBanner() {
  const programTier = useAppSelector((s) => s.user.programTier);
  const onboardingCompleted = useAppSelector((s) => s.user.onboardingCompleted);
  const apiUserRole = useAppSelector((s) => s.user.apiUserRole);
  const expiryBanner = useAppSelector((s) => s.user.expiryBanner);
  const { isDark } = useAppTheme();

  const isExpired = onboardingCompleted === true && !programTier && !isAdminRole(apiUserRole);
  if (!isExpired) return null;

  const message = expiryBanner?.message || "Your plan has expired. Renew to restore full access.";
  const buttonLabel = expiryBanner?.buttonLabel || "Pay Now";
  const paymentUrl = expiryBanner?.paymentUrl || "";

  const bg = isDark ? "hsl(28, 60%, 14%)" : "hsl(28, 90%, 95%)";
  const border = isDark ? "hsl(28, 55%, 30%)" : "hsl(28, 70%, 75%)";
  const iconColor = isDark ? "hsl(28, 80%, 65%)" : "hsl(28, 75%, 42%)";
  const textColor = isDark ? "hsl(28, 70%, 85%)" : "hsl(28, 60%, 25%)";
  const btnBg = isDark ? "hsl(28, 70%, 28%)" : "hsl(28, 75%, 42%)";

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
      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Outfit-Medium", color: textColor, lineHeight: 18 }}>
        {message}
      </Text>
      {paymentUrl ? (
        <Pressable
          onPress={() => Linking.openURL(paymentUrl)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: btnBg,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 8,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Text style={{ fontSize: 12, fontFamily: "Outfit-SemiBold", color: "#fff" }}>
            {buttonLabel}
          </Text>
          <ArrowRight size={12} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}
