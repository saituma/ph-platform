import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { SafeMaskedView, Transition } from "@/components/navigation/TransitionStack";
import { X } from "lucide-react-native";

type ScheduleEvent = {
  id: string;
  dateKey: string;
  startsAt: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  location: string;
  meetingLink?: string | null;
  type: "training" | "call" | "recovery";
  tag: string;
  athlete: string;
  coach: string;
  notes: string;
  status?: string;
};

export default function ScheduleEventScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const { event: eventParam, sharedBoundTag } = useLocalSearchParams<{
    event?: string;
    sharedBoundTag?: string;
  }>();

  const event = useMemo<ScheduleEvent | null>(() => {
    if (!eventParam) return null;
    try {
      return JSON.parse(String(eventParam)) as ScheduleEvent;
    } catch {
      return null;
    }
  }, [eventParam]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.overlay }}>
      <SafeMaskedView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Transition.View
            sharedBoundTag={sharedBoundTag}
            style={{
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 32,
              backgroundColor: p.cardWhite,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontFamily: "Outfit-Bold", color: p.textPrimary }}>Booking details</Text>
              <Pressable
                onPress={() => router.back()}
                style={{ height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: p.inputBg }}
              >
                <X size={18} color={p.textPrimary} />
              </Pressable>
            </View>

            {event ? (
              <>
                <View style={{ borderRadius: 22, padding: 16, backgroundColor: p.inputBg }}>
                  <Text style={{ fontSize: 15, fontFamily: "Outfit-Regular", color: p.textPrimary }}>
                    {event.title}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
                    {event.timeStart} - {event.timeEnd}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
                    Status: {event.status ?? "confirmed"}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
                    Location: {event.location ?? "TBD"}
                  </Text>
                  {event.meetingLink ? (
                    <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
                      Meeting: {event.meetingLink}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
                    Athlete: {event.athlete ?? "Athlete"}
                  </Text>
                </View>

                <View style={{ marginTop: 16, borderRadius: 22, padding: 16, backgroundColor: p.inputBg }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, textTransform: "uppercase", letterSpacing: 1.2 }}>
                    Notes
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textPrimary, marginTop: 8 }}>
                    {event.notes || "No notes yet."}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
                Event details are unavailable.
              </Text>
            )}

            <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100, backgroundColor: p.inputBg }}
                onPress={() => router.back()}
              >
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, textAlign: "center" }}>
                  Back
                </Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100, backgroundColor: p.accent }}
                onPress={() => router.back()}
              >
                <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.buttonPrimaryText, textTransform: "uppercase", letterSpacing: 1.2, textAlign: "center" }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </Transition.View>
        </View>
      </SafeMaskedView>
    </SafeAreaView>
  );
}
