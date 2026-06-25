import React from "react";
import { Pressable, View } from "react-native";
import { BottomSheet } from "heroui-native";
import { Bell, BellOff, Flag, Search, User, Users } from "lucide-react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";

type ThreadOptionsSheetProps = {
  open: boolean;
  onClose: () => void;
  onViewProfile?: () => void;
  onSearch?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onReport?: () => void;
  isGroup?: boolean;
  threadName?: string;
};

export function ThreadOptionsSheet({
  open,
  onClose,
  onViewProfile,
  onSearch,
  isMuted,
  onToggleMute,
  onReport,
  isGroup,
  threadName,
}: ThreadOptionsSheetProps) {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();

  const options = [
    {
      key: "profile",
      label: isGroup ? "Group Info" : "View Profile",
      Icon: isGroup ? Users : User,
      onPress: () => { onViewProfile?.(); onClose(); },
      destructive: false,
    },
    {
      key: "search",
      label: "Search in Chat",
      Icon: Search,
      onPress: () => { onSearch?.(); onClose(); },
      destructive: false,
    },
    {
      key: "mute",
      label: isMuted ? "Unmute notifications" : "Mute notifications",
      Icon: isMuted ? Bell : BellOff,
      onPress: () => { onToggleMute?.(); onClose(); },
      destructive: false,
    },
    {
      key: "report",
      label: "Report",
      Icon: Flag,
      onPress: () => { onReport?.(); onClose(); },
      destructive: true,
    },
  ] as const;

  return (
    <BottomSheet isOpen={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay className="bg-black/40" />
        <BottomSheet.Content
          snapPoints={["40%"]}
          enablePanDownToClose
          backgroundStyle={{ backgroundColor: isDark ? p.cardWhite : "#FFFFFF" }}
          handleIndicatorStyle={{
            backgroundColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.22)",
          }}
        >
          <View style={{ paddingTop: 4, paddingBottom: 24 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: p.divider,
                alignSelf: "center",
                marginBottom: 12,
              }}
            />

            {threadName ? (
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: "Outfit-SemiBold",
                  fontSize: 15,
                  color: p.textMuted,
                  paddingHorizontal: 20,
                  paddingBottom: 4,
                }}
              >
                {threadName}
              </Text>
            ) : null}

            {options.map((option, index) => {
              const Icon = option.Icon;
              const isLast = index === options.length - 1;
              return (
                <React.Fragment key={option.key}>
                  <Pressable
                    onPress={option.onPress}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: option.destructive
                          ? "rgba(255,59,48,0.08)"
                          : p.inputBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        size={20}
                        color={option.destructive ? "#FF3B30" : p.textPrimary}
                        strokeWidth={1.8}
                      />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontFamily: "Outfit-Medium",
                        color: option.destructive ? "#FF3B30" : p.textPrimary,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                  {!isLast && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: p.divider,
                        marginLeft: 76,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
