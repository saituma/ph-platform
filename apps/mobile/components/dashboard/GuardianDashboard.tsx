import { ActionButton } from "@/components/dashboard/ActionButton";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Skeleton } from "@/components/Skeleton";
import { Feather } from "@/components/ui/theme-icons";
import { useRefreshContext } from "@/context/RefreshContext";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export function GuardianDashboard() {
  const { colors } = useAppTheme();
  const { isLoading } = useRefreshContext();

  return (
    <View className="gap-8">
      <View className="flex-row flex-wrap gap-3">
        {isLoading ? (
          <>
            <View className="w-[48%] bg-input p-6 rounded-[28px] shadow-sm border border-app h-32 justify-center">
              <Skeleton
                circle
                width={32}
                height={32}
                style={{ marginBottom: 12 }}
              />
              <Skeleton width="40%" height={24} style={{ marginBottom: 4 }} />
            </View>
            <View className="w-[48%] bg-input p-6 rounded-[28px] shadow-sm border border-app h-32 justify-center">
              <Skeleton
                circle
                width={32}
                height={32}
                style={{ marginBottom: 12 }}
              />
              <Skeleton width="40%" height={24} style={{ marginBottom: 4 }} />
            </View>
          </>
        ) : (
          <>
            <View className="w-[48%] bg-input p-6 rounded-[28px] shadow-sm border border-app">
              <View className="bg-accent-light w-12 h-12 rounded-2xl items-center justify-center mb-4">
                <Feather name="users" size={24} className="text-accent" />
              </View>
              <Text className="text-3xl font-bold font-clash text-app">2</Text>
              <Text className="text-xs font-outfit text-secondary font-medium uppercase tracking-wider">
                Managed Athletes
              </Text>
            </View>
            <View className="w-[48%] bg-input p-6 rounded-[28px] shadow-sm border border-app">
              <View className="bg-success-soft w-12 h-12 rounded-2xl items-center justify-center mb-4">
                <Feather name="calendar" size={24} color={colors.success} />
              </View>
              <Text className="text-3xl font-bold font-clash text-app">3</Text>
              <Text className="text-xs font-outfit text-secondary font-medium uppercase tracking-wider">
                Active Events
              </Text>
            </View>
          </>
        )}
      </View>

      <View>
        <View className="flex-row justify-between items-center mb-4 px-1">
          <View className="flex-row items-center gap-3">
            <View className="h-6 w-1.5 rounded-full bg-accent" />
            <View>
              <Text className="text-xl font-bold font-clash text-app leading-tight">
                Today's Schedule
              </Text>
              <Text className="text-xs font-outfit text-secondary">
                Coordination & Bookings
              </Text>
            </View>
          </View>
          <TouchableOpacity>
            <Text className="text-accent font-bold font-outfit text-sm">
              View Calendar
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="bg-input p-6 rounded-[32px] shadow-sm border border-app h-28 justify-center" />
        ) : (
          <View className="bg-input p-6 rounded-[28px] shadow-sm border border-app border-l-[6px] border-l-accent">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-lg font-bold font-outfit text-app mb-1">
                  Private Session: Pitch A
                </Text>
                <View className="flex-row items-center gap-2">
                  <Feather name="clock" size={14} className="text-secondary" />
                  <Text className="text-secondary text-xs font-outfit">
                    4:00 PM - 5:30 PM (90 mins)
                  </Text>
                </View>
              </View>
              <View className="bg-accent-light px-3 py-1.5 rounded-xl border border-app">
                <Text className="font-bold font-outfit text-accent text-xs">
                  Booking
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 bg-secondary rounded-lg items-center justify-center">
                <Feather name="user" size={16} className="text-secondary" />
              </View>
              <Text className="text-sm text-app font-medium font-outfit">
                John Doe attending with Coach Oliver
              </Text>
            </View>
          </View>
        )}
      </View>

      <View>
        <View className="flex-row items-center gap-3 mb-4 px-1">
          <View className="h-6 w-1.5 rounded-full bg-accent" />
          <Text className="text-xl font-bold font-clash text-app">
            Parent Controls
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          <ActionButton
            icon="message-square"
            label="Chat"
            color="bg-accent-light"
            iconColor="text-accent"
          />
          <ActionButton
            icon="credit-card"
            label="Billing"
            color="bg-success-soft"
            iconColor={colors.success}
          />
          <ActionButton
            icon="file-plus"
            label="Diary"
            color="bg-warning-soft"
            iconColor={colors.warning}
          />
        </View>
      </View>
    </View>
  );
}
