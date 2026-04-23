import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";

export type ActiveRunLayersSheetIndex = -1 | 0 | 1;

export function ActiveRunLayersSheet({
  index,
  setIndex,
  mapStyle,
  onChangeMapStyle,
  pointsOfInterestEnabled,
  onTogglePointsOfInterest,
  colors,
  isDark,
  bottomInset,
}: {
  index: ActiveRunLayersSheetIndex;
  setIndex: (index: ActiveRunLayersSheetIndex) => void;
  mapStyle: "road" | "satellite";
  onChangeMapStyle: (next: "road" | "satellite") => void;
  pointsOfInterestEnabled: boolean;
  onTogglePointsOfInterest: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  bottomInset: number;
}) {
  const snapPoints = useMemo(() => ["58%", "88%"] as const, []);
  const cardBg = isDark ? "rgba(36,34,29,0.98)" : "rgba(255,255,255,0.98)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)";

  return (
    <BottomSheet
      index={index}
      snapPoints={snapPoints as any}
      onChange={(next) => setIndex((next >= 0 ? next : -1) as ActiveRunLayersSheetIndex)}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      bottomInset={0}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.45}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: cardBg,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: cardBorder,
      }}
      style={{ left: 0, right: 0 }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.22)",
        width: 44,
      }}
    >
      {index >= 0 ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset }}
        >
          <View
            style={{
              paddingTop: 14,
              paddingHorizontal: 20,
              paddingBottom: 26,
              minHeight: 520,
            }}
          >
            <SectionTitle title="Map Types" colors={colors} />
            <View style={{ flexDirection: "row", gap: 16, marginTop: 18 }}>
              <SelectionCard
                label="Standard"
                active={mapStyle === "road"}
                onPress={() => onChangeMapStyle("road")}
                colors={colors}
                isDark={isDark}
                preview="road"
              />
              <SelectionCard
                label="Satellite"
                active={mapStyle === "satellite"}
                onPress={() => onChangeMapStyle("satellite")}
                colors={colors}
                isDark={isDark}
                preview="satellite"
              />
            </View>

            <View style={{ marginTop: 34 }}>
              <SectionTitle title="Layers" colors={colors} />
              <View style={{ flexDirection: "row", gap: 16, marginTop: 18 }}>
                <SelectionCard
                  label="Points of Interest"
                  active={pointsOfInterestEnabled}
                  onPress={onTogglePointsOfInterest}
                  colors={colors}
                  isDark={isDark}
                  preview="poi"
                />
              </View>
            </View>
          </View>
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={{ height: 0 }}>
          <View />
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}

function SectionTitle({
  title,
  colors,
}: {
  title: string;
  colors: Record<string, string>;
}) {
  return (
    <Text
      style={{
        fontFamily: fonts.heading1,
        fontSize: 28,
        color: colors.textPrimary,
      }}
    >
      {title}
    </Text>
  );
}

function SelectionCard({
  label,
  active,
  onPress,
  colors,
  isDark,
  preview,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
  preview: "road" | "satellite" | "poi";
}) {
  const frameBorder = active
    ? "#FF5A16"
    : isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(15,23,42,0.10)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 96,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          borderWidth: 4,
          borderColor: frameBorder,
          padding: 4,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor:
              preview === "satellite"
                ? "#6C826D"
                : preview === "poi"
                  ? "#27423B"
                  : "#1D4255",
          }}
        >
          {preview === "road" ? (
            <RoadPreview />
          ) : preview === "satellite" ? (
            <SatellitePreview />
          ) : (
            <PoiPreview colors={colors} />
          )}
        </View>
      </View>
      <Text
        style={{
          marginTop: 12,
          fontFamily: active ? fonts.heading2 : fonts.bodyMedium,
          fontSize: active ? 16 : 15,
          color: active ? "#FF5A16" : colors.textPrimary,
          lineHeight: 20,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RoadPreview() {
  return (
    <View style={{ flex: 1, backgroundColor: "#183A53" }}>
      <PreviewLine style={{ left: -8, top: 46, width: 120, transform: [{ rotate: "-10deg" }] }} color="#3E4E59" height={10} />
      <PreviewLine style={{ left: 10, top: 14, width: 78, transform: [{ rotate: "35deg" }] }} color="#34D17C" height={4} />
      <PreviewLine style={{ left: 20, top: 34, width: 62, transform: [{ rotate: "-14deg" }] }} color="#76818D" height={3} />
      <PreviewLine style={{ left: 6, top: 62, width: 86, transform: [{ rotate: "6deg" }] }} color="#34D17C" height={4} />
    </View>
  );
}

function SatellitePreview() {
  return (
    <View style={{ flex: 1, backgroundColor: "#7D8E72" }}>
      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(250,247,222,0.38)" }} />
      <PreviewBlob style={{ left: -4, top: 10, width: 54, height: 40 }} color="#8AA379" />
      <PreviewBlob style={{ right: -10, bottom: 6, width: 56, height: 42 }} color="#AAB884" />
      <PreviewLine style={{ left: -12, top: 52, width: 128, transform: [{ rotate: "18deg" }] }} color="#D9E0D7" height={8} />
    </View>
  );
}

function PoiPreview({ colors }: { colors: Record<string, string> }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#27423B" }}>
      <PreviewLine style={{ left: -10, top: 44, width: 130, transform: [{ rotate: "-10deg" }] }} color="#3E5B53" height={8} />
      <Badge style={{ left: 10, bottom: 10 }} bg="#466F9D" icon="P" />
      <Badge style={{ right: 8, top: 10 }} bg="#D65580" icon="🍴" />
      <View
        style={{
          position: "absolute",
          left: 34,
          top: 28,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.textPrimary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="location" size={14} color="#2A2A2A" />
      </View>
    </View>
  );
}

function PreviewLine({
  style,
  color,
  height,
}: {
  style: object;
  color: string;
  height: number;
}) {
  return (
    <View
      style={[
        {
          position: "absolute",
          borderRadius: 999,
          backgroundColor: color,
          height,
        },
        style,
      ]}
    />
  );
}

function PreviewBlob({
  style,
  color,
}: {
  style: object;
  color: string;
}) {
  return (
    <View
      style={[
        {
          position: "absolute",
          borderRadius: 999,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function Badge({
  style,
  bg,
  icon,
}: {
  style: object;
  bg: string;
  icon: string;
}) {
  return (
    <View
      style={[
        {
          position: "absolute",
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.8)",
        },
        style,
      ]}
    >
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{icon}</Text>
    </View>
  );
}
