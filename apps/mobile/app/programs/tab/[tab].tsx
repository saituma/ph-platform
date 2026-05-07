import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Text } from "@/components/ScaledText";
import { getSessionTypesForTab } from "@/constants/program-details";
import { apiRequest } from "@/lib/api";
import { normalizeProgramTier } from "@/lib/planAccess";
import { useAppSelector } from "@/store/hooks";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { ArrowLeft } from "lucide-react-native";

type ExerciseMetadata = {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restSeconds?: number | null;
  steps?: string | null;
  cues?: string | null;
  progression?: string | null;
  regression?: string | null;
  category?: string | null;
  equipment?: string | null;
};

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  metadata?: ExerciseMetadata | null;
  order?: number | null;
  updatedAt?: string | null;
};

export default function ProgramTabDetailScreen() {
  const router = useRouter();
  const deepLinkFallbackDoneRef = useRef(false);
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const tabName = useMemo(() => {
    const raw = Array.isArray(tab) ? tab[0] : tab;
    return raw ? decodeURIComponent(String(raw)) : "";
  }, [tab]);
  const token = useAppSelector((state) => state.user.token);
  const programTier = useAppSelector((state) => state.user.programTier);
  const athleteUserId = useAppSelector((state) => state.user.athleteUserId);
  const managedAthletes = useAppSelector((state) => state.user.managedAthletes);
  const p = useAdminPastel();

  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected =
      managedAthletes.find(
        (athlete) =>
          athlete.id === athleteUserId || athlete.userId === athleteUserId,
      ) ??
      managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);

  const [items, setItems] = useState<ProgramSectionContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAthlete = useMemo(() => {
    if (!managedAthletes.length) return null;
    return managedAthletes.find((athlete) => athlete.id === athleteUserId || athlete.userId === athleteUserId) ?? managedAthletes[0];
  }, [athleteUserId, managedAthletes]);

  useEffect(() => {
    if (deepLinkFallbackDoneRef.current) return;
    if (router.canGoBack()) return;
    deepLinkFallbackDoneRef.current = true;
    router.replace("/(tabs)");
  }, [router]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/programs");
  }, [router]);

  const loadContent = useCallback(async () => {
    if (!token || !tabName) return;
    const types = getSessionTypesForTab(tabName);
    if (types.length === 0) {
      setItems([]);
      return;
    }
    const tier = normalizeProgramTier(programTier) ?? "PHP";
    const ageQ =
      activeAthleteAge !== null
        ? `&age=${encodeURIComponent(String(activeAthleteAge))}`
        : "";
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        types.map((type) =>
          apiRequest<{ items: ProgramSectionContent[] }>(
            `/program-section-content?sectionType=${encodeURIComponent(String(type))}&programTier=${encodeURIComponent(tier)}${ageQ}`,
            { token },
          ),
        ),
      );
      const merged = results
        .flatMap((r) => (r.status === "fulfilled" ? (r.value.items ?? []) : []))
        .filter((item) => item && item.id);
      merged.sort((a, b) => {
        const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
        const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
      });
      setItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content.");
    } finally {
      setIsLoading(false);
    }
  }, [token, tabName, activeAthleteAge, programTier]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  return (
    <ThemedScrollView
      onRefresh={loadContent}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
        {/* Hero header */}
        <View
          style={{
            overflow: "hidden", borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20,
            backgroundColor: p.cardWhite,
          }}
        >
          <View
            style={{
              position: "absolute", right: -40, top: -32, height: 112, width: 112,
              borderRadius: 56, backgroundColor: p.accentSoft,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={handleBack}
              style={{
                height: 44, width: 44, alignItems: "center", justifyContent: "center",
                borderRadius: 18, backgroundColor: p.inputBg,
              }}
            >
              <ArrowLeft size={20} color={p.accent} />
            </Pressable>
            <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: p.inputBg }}>
              <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", textTransform: "uppercase", letterSpacing: 1.3, color: p.accent }}>
                Tab detail
              </Text>
            </View>
          </View>

          <Text style={{ marginTop: 16, fontSize: 26, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
            {tabName || "Program Section"}
          </Text>
          <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {currentAthlete?.name ? (
              <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.accentSoft }}>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.accent }}>
                  Athlete: {currentAthlete.name}
                </Text>
              </View>
            ) : null}
            {currentAthlete?.age ? (
              <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.inputBg }}>
                <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                  {currentAthlete.age} yrs
                </Text>
              </View>
            ) : null}
            <View style={{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: p.inputBg }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                {items.length} items
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ marginTop: 24, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: p.cardWhite }}>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>Loading content...</Text>
          </View>
        ) : error ? (
          <View style={{ marginTop: 24, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: p.cardWhite }}>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={{ marginTop: 24, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: p.cardWhite }}>
            <Text style={{ fontSize: 14, fontFamily: "Outfit-Regular", color: p.textSecondary }}>
              No content available for this section yet.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 24, gap: 16 }}>
            {items.map((item) => {
              const meta = (item.metadata ?? {}) as ExerciseMetadata;
              const hasExercise = !!(meta.sets || meta.reps || meta.duration || meta.restSeconds);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/programs/content/${item.id}`)}
                  style={{
                    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 16, gap: 8,
                    backgroundColor: p.cardWhite,
                  }}
                >
                  <Text style={{ fontSize: 16, fontFamily: "Outfit-Bold", color: p.textPrimary }}>
                    {item.title}
                  </Text>
                  {hasExercise && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {meta.sets != null && (
                        <View style={{ borderRadius: 100, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.accent }}>{meta.sets} sets</Text>
                        </View>
                      )}
                      {meta.reps != null && (
                        <View style={{ borderRadius: 100, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.accent }}>{meta.reps} reps</Text>
                        </View>
                      )}
                      {meta.duration != null && (
                        <View style={{ borderRadius: 100, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.accent }}>{meta.duration}s</Text>
                        </View>
                      )}
                      {meta.restSeconds != null && (
                        <View style={{ borderRadius: 100, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Regular", color: p.accent }}>{meta.restSeconds}s rest</Text>
                        </View>
                      )}
                      {meta.category && (
                        <View style={{ borderRadius: 100, backgroundColor: p.accentSoft, paddingHorizontal: 10, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontFamily: "Outfit-Bold", color: p.accent }}>{meta.category}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <Text style={{ fontSize: 12, fontFamily: "Outfit-Regular", color: p.textSecondary, marginTop: 4 }}>
                    Tap to view details{item.videoUrl ? ' and video' : ''}.
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ThemedScrollView>
  );
}
