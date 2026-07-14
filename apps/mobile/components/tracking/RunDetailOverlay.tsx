import React, { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import {
  ChevronLeft,
  Clock,
  Flame,
  Gauge,
  MapPin,
  NotebookPen,
  Route,
  Share2,
  Users,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { formatDurationClock } from "@/lib/tracking/runUtils";
import type { RunRecord } from "@/lib/sqliteRuns";

type RunCoord = { latitude: number; longitude: number; timestamp?: number; altitude?: number | null };

function parseCoords(value: string | null | undefined): RunCoord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (pt): pt is RunCoord =>
        pt && typeof pt.latitude === "number" && typeof pt.longitude === "number",
    );
  } catch {
    return [];
  }
}

function formatRunPace(distanceMeters: number, durationSeconds: number): string {
  const km = distanceMeters / 1000;
  if (km <= 0 || durationSeconds <= 0) return "-";
  const secPerKm = durationSeconds / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

/** feel_tags is a JSON array of labels; tolerate legacy/corrupt rows rather than crashing the sheet. */
function parseFeelTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
  } catch {
    return [];
  }
}

function effortScoreForRun(run: RunRecord): number {
  if (run.effort_level != null && run.effort_level >= 0 && run.effort_level !== -1) {
    return Math.min(100, Math.max(0, Math.round(run.effort_level * 10)));
  }
  const km = run.distance_meters / 1000;
  const mins = run.duration_seconds / 60;
  return Math.min(100, Math.max(8, Math.round(km * 8 + mins * 0.45)));
}

function effortLabel(score: number): string {
  if (score >= 80) return "All-out";
  if (score >= 60) return "Hard";
  if (score >= 35) return "Steady";
  return "Easy";
}

function sportLabel(sport: string | null | undefined): string {
  switch (sport) {
    case "ride": return "Ride";
    case "walk": return "Walk";
    case "hike": return "Hike";
    case "swim": return "Swim";
    case "trail_run": return "Trail Run";
    case "treadmill": return "Treadmill";
    case "virtual_run": return "Virtual Run";
    default: return "Run";
  }
}

function RouteThumb({ coords, accent, isDark }: { coords: RunCoord[]; accent: string; isDark: boolean }) {
  const path = useMemo(() => {
    if (coords.length < 2) return "";
    const thin = coords.length > 80 ? coords.filter((_, i) => i % Math.ceil(coords.length / 80) === 0) : coords;
    const sortedLats = [...thin.map((c) => c.latitude)].sort((a, b) => a - b);
    const sortedLngs = [...thin.map((c) => c.longitude)].sort((a, b) => a - b);
    const medLat = sortedLats[Math.floor(sortedLats.length / 2)]!;
    const medLng = sortedLngs[Math.floor(sortedLngs.length / 2)]!;
    const clean = thin.filter((c) => Math.abs(c.latitude - medLat) < 0.05 && Math.abs(c.longitude - medLng) < 0.05);
    if (clean.length < 2) return "";
    const lats = clean.map((c) => c.latitude);
    const lngs = clean.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;
    return clean
      .map((coord, index) => {
        const x = 18 + ((coord.longitude - minLng) / lngRange) * 264;
        const y = 18 + ((maxLat - coord.latitude) / latRange) * 104;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [coords]);

  return (
    <View style={{ height: 220, overflow: "hidden", backgroundColor: isDark ? "#111" : "#f0f0f0" }}>
      <LinearGradient
        colors={["rgba(47,159,61,0.22)", "rgba(47,159,61,0.05)"]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <Svg width="100%" height="100%" viewBox="0 0 300 140">
        <Circle cx="48" cy="34" r="42" fill={accent} opacity="0.08" />
        <Circle cx="248" cy="112" r="58" fill={accent} opacity="0.1" />
        {path ? (
          <>
            <Path d={path} stroke="rgba(15,23,42,0.16)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={path} stroke={accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        ) : null}
      </Svg>
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 }}
      />
      {!path && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <MapPin size={32} color={accent} opacity={0.4} />
        </View>
      )}
    </View>
  );
}

function StatCard({ icon, label, value, p }: { icon: React.ReactNode; label: string; value: string; p: ReturnType<typeof useAdminPastel> }) {
  return (
    <View style={{ flex: 1, backgroundColor: p.cardWhite, borderRadius: 18, padding: 14, gap: 8, borderWidth: 1, borderColor: p.divider }}>
      {icon}
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color: p.textPrimary, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 11, color: p.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function RunDetailContent({
  run,
  p,
  isDark,
  onBack,
  onShare,
}: {
  run: RunRecord;
  p: ReturnType<typeof useAdminPastel>;
  isDark: boolean;
  onBack: () => void;
  onShare: () => void;
}) {
  const coords = useMemo(() => parseCoords(run.coordinates), [run.coordinates]);
  const feelTags = useMemo(() => parseFeelTags(run.feel_tags), [run.feel_tags]);
  const score = effortScoreForRun(run);
  const label = sportLabel(run.sport);
  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const pace = formatRunPace(run.distance_meters, run.duration_seconds);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ position: "relative" }}>
          <RouteThumb coords={coords} accent={p.accent} isDark={isDark} />

          <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, gap: 10 }}>
            <Pressable
              hitSlop={12}
              onPress={onBack}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}
            >
              <ChevronLeft size={20} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              hitSlop={12}
              onPress={onShare}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}
            >
              <Share2 size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 18 }}>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 26, color: "#fff", letterSpacing: -0.5 }}>{label}</Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>{date}</Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard icon={<Route size={18} color={p.accent} />} label="Distance" value={`${(run.distance_meters / 1000).toFixed(2)} km`} p={p} />
            <StatCard icon={<Clock size={18} color={p.accent} />} label="Duration" value={formatDurationClock(run.duration_seconds)} p={p} />
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard icon={<Gauge size={18} color={p.accent} />} label="Pace" value={pace} p={p} />
            {run.calories > 0 ? (
              <StatCard icon={<Flame size={18} color={p.accent} />} label="Calories" value={`${Math.round(run.calories)} kcal`} p={p} />
            ) : (
              <StatCard icon={<Zap size={18} color={p.accent} />} label="Effort" value={`${effortLabel(score)} · ${score}`} p={p} />
            )}
          </View>

          <View style={{ backgroundColor: p.cardWhite, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: p.divider }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Zap size={20} color={p.accent} />
              </View>
              <View>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>Effort score</Text>
                <Text style={{ fontFamily: "Outfit-Regular", fontSize: 12, color: p.textMuted }}>{effortLabel(score)} intensity</Text>
              </View>
            </View>
            <View style={{ backgroundColor: p.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>{score}/100</Text>
            </View>
          </View>

          {feelTags.length > 0 && (
            <View style={{ backgroundColor: p.cardWhite, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: p.divider, gap: 10 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.textSecondary, letterSpacing: 2 }}>HOW IT FELT</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {feelTags.map((tag) => (
                  <View key={tag} style={{ backgroundColor: p.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 }}>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.accent }}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {run.notes ? (
            <View style={{ backgroundColor: p.cardWhite, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: p.divider, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <NotebookPen size={14} color={p.textSecondary} />
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.textSecondary, letterSpacing: 2 }}>NOTES</Text>
              </View>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 14, color: p.textPrimary, lineHeight: 20 }}>{run.notes}</Text>
            </View>
          ) : null}

          <View style={{ backgroundColor: p.cardWhite, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: p.divider }}>
            <Users size={18} color={p.textMuted} />
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted, flex: 1 }}>
              {run.privacy === "team" ? "Shared with your team" : "Visible to you and your coach"}
            </Text>
          </View>

          {coords.length < 2 && (
            <View style={{ backgroundColor: p.cardWhite, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: p.divider }}>
              <MapPin size={18} color={p.textMuted} />
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textMuted, flex: 1, lineHeight: 18 }}>
                No GPS route recorded for this session.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function RunDetailOverlay({
  run,
  onClose,
  onShare,
}: {
  run: RunRecord | null;
  onClose: () => void;
  onShare: (run: RunRecord) => void;
}) {
  const { isDark } = useAppTheme();
  const p = useAdminPastel();

  return (
    <Modal
      visible={run !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {run ? (
        <RunDetailContent
          run={run}
          p={p}
          isDark={isDark}
          onBack={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
          onShare={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onShare(run);
          }}
        />
      ) : null}
    </Modal>
  );
}
