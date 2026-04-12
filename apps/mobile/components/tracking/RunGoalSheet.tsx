import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts, radius, spacing, icons } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OsmTapPickMap } from "./OsmTapPickMap";
import { shouldUseOsmMap } from "@/lib/mapsConfig";

type Destination = { latitude: number; longitude: number };

type RunGoalSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (goalKm: number | null, destination: Destination | null) => void;
};

export function RunGoalSheet({
  visible,
  onClose,
  onConfirm,
}: RunGoalSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [step, setStep] = useState<"destination" | "distance">("destination");
  const [showPicker, setShowPicker] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [goalText, setGoalText] = useState("");
  const [region, setRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const isExpoGoAndroid =
    Constants.appOwnership === "expo" && Platform.OS === "android";

  useEffect(() => {
    if (!visible) return;
    setStep("destination");
    setShowPicker(false);
    setDestination(null);
    setGoalText("");
  }, [visible]);

  useEffect(() => {
    if (!showPicker) return;
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isMounted) return;
        const nextRegion: Region = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(nextRegion);
        // `initialRegion` only applies on first mount; animate so the picker centers correctly.
        mapRef.current?.animateToRegion(nextRegion, 450);
      } catch {
        // ignore and use default region
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [showPicker]);

  const parsedGoalKm = useMemo(() => {
    const value = Number(goalText);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  }, [goalText]);

  const closeAndConfirm = (goalKm: number | null, dest: Destination | null) => {
    onConfirm(goalKm, dest);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              maxHeight: "85%",
              paddingTop: spacing.xl,
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl + insets.bottom,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
            >
              {!showPicker && step === "destination" ? (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.heading1,
                      fontSize: 22,
                      color: colors.text,
                    }}
                  >
                    Do you have a destination?
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 6,
                    }}
                  >
                    Optional — you can skip this.
                  </Text>

                  <View style={{ marginTop: spacing.lg, gap: 12 }}>
                    <Pressable
                      onPress={() => setShowPicker(true)}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderMid,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name={icons.route.name as any}
                        size={18}
                        color={colors.textPrimary}
                      />
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textPrimary,
                        }}
                      >
                        Pick on map
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setStep("distance")}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: "transparent",
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {showPicker ? (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.heading1,
                      fontSize: 20,
                      color: colors.text,
                    }}
                  >
                    Tap to drop a destination
                  </Text>
                  {isExpoGoAndroid ? (
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      Expo Go on Android may not render the map. You can still
                      skip.
                    </Text>
                  ) : null}
                  <View
                    style={{
                      height: 240,
                      borderRadius: radius.xl,
                      overflow: "hidden",
                      marginTop: spacing.md,
                    }}
                  >
                    {shouldUseOsmMap() ? (
                      <OsmTapPickMap
                        region={region}
                        destination={destination}
                        isDark={isDark}
                        backgroundColor={colors.surfaceHigh}
                        onPick={setDestination}
                      />
                    ) : (
                      <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        initialRegion={region}
                        onPress={(e) => {
                          setDestination(e.nativeEvent.coordinate);
                        }}
                      >
                        {destination ? (
                          <Marker coordinate={destination} />
                        ) : null}
                      </MapView>
                    )}
                  </View>
                  <View style={{ marginTop: spacing.lg, gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        setShowPicker(false);
                        setStep("distance");
                      }}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textInverse,
                        }}
                      >
                        Use this destination
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setDestination(null);
                        setShowPicker(false);
                        setStep("distance");
                      }}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: "transparent",
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {!showPicker && step === "distance" ? (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.heading1,
                      fontSize: 22,
                      color: colors.text,
                    }}
                  >
                    Any distance goal?
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 6,
                    }}
                  >
                    Optional — enter a number in km.
                  </Text>

                  <View style={{ marginTop: spacing.lg }}>
                    <TextInput
                      keyboardType="decimal-pad"
                      placeholder="e.g., 5.0"
                      placeholderTextColor={colors.textDim}
                      value={goalText}
                      onChangeText={setGoalText}
                      style={{
                        height: 52,
                        borderRadius: radius.lg,
                        borderColor: colors.borderMid,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        fontFamily: fonts.bodyMedium,
                        color: colors.text,
                        backgroundColor: colors.surfaceHigh,
                      }}
                    />
                  </View>

                  <View style={{ marginTop: spacing.lg, gap: 10 }}>
                    <Pressable
                      onPress={() => closeAndConfirm(parsedGoalKm, destination)}
                      style={{
                        height: 56,
                        borderRadius: radius.xl,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textInverse,
                        }}
                      >
                        Start Run
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => closeAndConfirm(null, destination)}
                      style={{
                        height: 56,
                        borderRadius: radius.xl,
                        backgroundColor: "transparent",
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
