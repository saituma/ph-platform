import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedScrollView } from "@/components/ThemedScrollView";
import { ProgramTabBar } from "@/components/programs/ProgramTabBar";
import { Text } from "@/components/ScaledText";
import {
  BookingsPanel,
  FoodDiaryPanel,
  PhysioReferralPanel,
  VideoUploadPanel,
} from "@/components/programs/ProgramPanels";
import {
  PROGRAM_TABS,
  TRAINING_TABS,
  getSessionTypesForTab,
  ProgramId,
} from "@/constants/program-details";
import { PROGRAM_TIERS } from "@/constants/Programs";
import { useAppSelector } from "@/store/hooks";
import { useRole } from "@/context/RoleContext";
import {
  canAccessTier,
  normalizeProgramTier,
  programIdToTier,
  tierRank,
} from "@/lib/planAccess";
import { apiRequest } from "@/lib/api";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { useAgeExperience } from "@/context/AgeExperienceContext";

const PROGRAM_TITLES: Record<ProgramId, string> = {
  php: "PHP Program",
  plus: "PHP Plus",
  premium: "PHP Premium",
};

type ProgramDetailPanelProps = {
  programId: ProgramId;
  showBack?: boolean;
  onBack?: () => void;
  onNavigate?: (path: string) => void;
};

type ProgramSectionContent = {
  id: number;
  sectionType: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  order?: number | null;
  updatedAt?: string | null;
};

export function ProgramDetailPanel({
  programId,
  showBack = false,
  onBack,
  onNavigate,
}: ProgramDetailPanelProps) {
  const { programTier, token, athleteUserId, managedAthletes } = useAppSelector(
    (state) => state.user,
  );
  const { role } = useRole();
  const { isSectionHidden } = useAgeExperience();
  const [phpPlusTabs, setPhpPlusTabs] = useState<string[] | null>(null);
  const activeAthleteAge = useMemo(() => {
    if (!managedAthletes.length) return null;
    const selected =
      managedAthletes.find((athlete) => athlete.id === athleteUserId) ??
      managedAthletes[0];
    return selected?.age ?? null;
  }, [managedAthletes, athleteUserId]);
  const tabs = useMemo(() => {
    if (programId === "plus") {
      return phpPlusTabs ?? [];
    }
    let base = PROGRAM_TABS[programId];
    if (role === "Athlete") {
      base = base.filter(
        (tab) =>
          tab !== "Parent Education" &&
          tab !== "Nutrition & Food Diaries" &&
          tab !== "Submit Diary",
      );
    }
    if (role === "Guardian") {
      base = base.filter((tab) => tab !== "Video Upload");
    }
    if (isSectionHidden("videoFeedback")) {
      base = base.filter((tab) => tab !== "Video Upload");
    }
    if (isSectionHidden("foodDiary")) {
      base = base.filter(
        (tab) => tab !== "Nutrition & Food Diaries" && tab !== "Submit Diary",
      );
    }
    if (isSectionHidden("physioReferrals")) {
      base = base.filter(
        (tab) => tab !== "Physio Referral" && tab !== "Physio Referrals",
      );
    }
    return base;
  }, [programId, role, isSectionHidden, phpPlusTabs]);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionContent, setSectionContent] = useState<ProgramSectionContent[]>(
    [],
  );
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const loadPhpPlusTabs = useCallback(async () => {
    if (programId !== "plus") return;
    try {
      const response = await apiRequest<{ tabs?: string[] }>(
        `/onboarding/php-plus-tabs?ts=${Date.now()}`,
        { method: "GET", suppressLog: true },
      );
      if (Array.isArray(response.tabs)) {
        setPhpPlusTabs(response.tabs.map((tab) => String(tab)));
      }
    } catch {
      setPhpPlusTabs(null);
    }
  }, [programId]);

  useEffect(() => {
    void loadPhpPlusTabs();
  }, [loadPhpPlusTabs]);

  useEffect(() => {
    setActiveTab(tabs[0]);
  }, [tabs]);

  const filteredSectionContent = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sectionContent;
    return sectionContent.filter((item) => {
      const fields = [item.title, item.body];
      return fields.some((field) =>
        String(field ?? "").toLowerCase().includes(query),
      );
    });
  }, [searchQuery, sectionContent]);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const tabByType = new Map<string, string>();
    tabs.forEach((tab) => {
      getSessionTypesForTab(tab).forEach((type) => {
        tabByType.set(String(type), tab);
      });
    });

    const results: {
      id: string;
      title: string;
      subtitle: string;
      tab: string;
    }[] = [];

    tabs.forEach((tab) => {
      if (tab.toLowerCase().includes(query)) {
        results.push({
          id: `tab-${tab}`,
          title: tab,
          subtitle: "Section",
          tab,
        });
      }
    });

    sectionContent.forEach((item) => {
      const tab = tabByType.get(String(item.sectionType ?? ""));
      if (!tab) return;
      const contentTitle = String(item.title ?? "");
      const contentBody = String(item.body ?? "");
      if (
        contentTitle.toLowerCase().includes(query) ||
        contentBody.toLowerCase().includes(query)
      ) {
        results.push({
          id: `content-${item.id}`,
          title: contentTitle || "Program content",
          subtitle: `Content • ${tab}`,
          tab,
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, tabs, sectionContent]);

  const loadSectionContent = useCallback(
    async (tab: string) => {
      if (!token) {
        setSectionContent([]);
        return;
      }
      const types = getSessionTypesForTab(tab);
      if (types.length === 0) {
        setSectionContent([]);
        return;
      }
      setIsLoadingContent(true);
      setContentError(null);
      try {
        const responses = await Promise.all(
          types.map((type) =>
            apiRequest<{ items: ProgramSectionContent[] }>(
              `/program-section-content?sectionType=${encodeURIComponent(
                String(type),
              )}${activeAthleteAge !== null ? `&age=${encodeURIComponent(String(activeAthleteAge))}` : ""}`,
              { token },
            ),
          ),
        );
        const merged = responses
          .flatMap((res) => res.items ?? [])
          .filter((item) => item && item.id);
        merged.sort((a, b) => {
          const orderA = Number.isFinite(a.order) ? (a.order as number) : 9999;
          const orderB = Number.isFinite(b.order) ? (b.order as number) : 9999;
          if (orderA !== orderB) return orderA - orderB;
          return String(b.updatedAt ?? "").localeCompare(
            String(a.updatedAt ?? ""),
          );
        });
        setSectionContent(merged);
      } catch (err) {
        setContentError(
          err instanceof Error
            ? err.message
            : "Failed to load program content.",
        );
      } finally {
        setIsLoadingContent(false);
      }
    },
    [token, activeAthleteAge],
  );

  useEffect(() => {
    void loadSectionContent(activeTab);
  }, [activeTab, loadSectionContent]);

  const handlePageRefresh = async () => {
    await Promise.all([loadSectionContent(activeTab), loadPhpPlusTabs()]);
    setRefreshToken((prev) => prev + 1);
  };

  const handleVideoPress = (url: string) => {
    setActiveVideoUrl(url);
  };

  const renderTrainingContent = () => {
    const visibleContent = searchQuery.trim()
      ? filteredSectionContent
      : sectionContent;
    const showContentLoading = isLoadingContent;
    const showContentError = contentError;

    if (visibleContent.length === 0) {
      return (
        <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
          <Text className="text-sm font-outfit text-secondary text-center">
            {searchQuery.trim()
              ? "No matching content found."
              : "No content configured for this section yet. Ask your coach/admin to add content in Web Admin."}
          </Text>
        </View>
      );
    }
    return (
      <View className="gap-4">
        {showContentLoading ? (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-sm font-outfit text-secondary text-center">
              Loading section content...
            </Text>
          </View>
        ) : null}
        {showContentError ? (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-sm font-outfit text-secondary text-center">
              {showContentError}
            </Text>
          </View>
        ) : null}
        {visibleContent.map((item) => (
          <View
            key={`content-${item.id}`}
            className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3"
          >
            <Text className="text-lg font-clash text-app font-bold">{item.title}</Text>
            <Text className="text-sm font-outfit text-secondary leading-relaxed">
              {item.body}
            </Text>
            {item.videoUrl ? (
              <Pressable
                onPress={() => setActiveVideoUrl(item.videoUrl ?? null)}
                className="self-start rounded-full px-4 py-2 bg-[#2F8F57]"
              >
                <Text className="text-xs font-outfit text-white">
                  Watch video
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderTab = () => {
    const hasAccess = canAccessTier(programTier, programIdToTier(programId));
    const normalizedTier = normalizeProgramTier(programTier);
    if (!hasAccess) {
      const title = normalizedTier
        ? "Program locked"
        : "Complete onboarding to unlock programs";
      const body = normalizedTier
        ? "This program is available on a higher tier."
        : "Once your plan is active, your full program will appear here.";
      return (
        <View className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3">
          <View className="flex-row items-center gap-2">
            <Feather name="lock" size={16} color="#94A3B8" />
            <Text className="text-xs font-outfit text-secondary uppercase tracking-[1.2px]">
              Pending Access
            </Text>
          </View>
          <Text className="text-lg font-clash text-app font-bold">{title}</Text>
          <Text className="text-sm font-outfit text-secondary leading-relaxed">{body}</Text>
        </View>
      );
    }
    if (activeTab === "Program") {
      const tier = PROGRAM_TIERS.find((item) => item.id === programId);
      return (
        <View className="gap-4">
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5 gap-3">
            <Text className="text-lg font-clash text-app font-bold">Program Features</Text>
            {tier?.features?.map((feature, index) => (
              <View
                key={`${tier.id}-feature-${index}`}
                className="flex-row items-center gap-3"
              >
                <View className="h-5 w-5 rounded-full bg-success-soft items-center justify-center">
                  <Feather name="check" size={10} color="#16A34A" />
                </View>
                <Text className="text-sm font-outfit text-app flex-1">
                  {feature}
                </Text>
              </View>
            ))}
          </View>
          {renderTrainingContent()}
        </View>
      );
    }

    if (TRAINING_TABS.has(activeTab)) {
      return renderTrainingContent();
    }

    if (activeTab === "Book In" || activeTab === "Bookings") {
      return <BookingsPanel onOpen={() => onNavigate?.("/(tabs)/schedule")} />;
    }

    if (activeTab === "Physio Referral" || activeTab === "Physio Referrals") {
      return (
        <PhysioReferralPanel discount={programId === "plus" ? "10%" : undefined} />
      );
    }

    if (activeTab === "Nutrition & Food Diaries" || activeTab === "Submit Diary") {
      if (role !== "Guardian") {
        return (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-sm font-outfit text-secondary text-center">
              Food diaries are managed by guardians.
            </Text>
          </View>
        );
      }
      return <FoodDiaryPanel />;
    }

    if (activeTab === "Video Upload") {
      if (role !== "Athlete") {
        return (
          <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
            <Text className="text-sm font-outfit text-secondary text-center">
              Video uploads are available for athletes.
            </Text>
          </View>
        );
      }
      return <VideoUploadPanel refreshToken={refreshToken} />;
    }

    return (
      <View className="rounded-3xl border border-app/10 bg-input px-6 py-5">
        <Text className="text-sm font-outfit text-secondary text-center">
          Content coming soon.
        </Text>
      </View>
    );
  };

  return (
    <>
      <ThemedScrollView
        onRefresh={handlePageRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            {showBack ? (
              <TouchableOpacity
                onPress={() => (onBack ? onBack() : undefined)}
                className="h-10 w-10 items-center justify-center bg-secondary rounded-full"
              >
                <Feather name="arrow-left" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <View className="w-10" />
            )}
            <Text className="text-xl font-clash text-app font-bold">
              {PROGRAM_TITLES[programId]}
            </Text>
            <View className="w-10" />
          </View>

          <Text className="text-sm font-outfit text-secondary mb-4">
            Select a tab to view your program sessions and resources.
          </Text>
        </View>

        <ProgramTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {searchQuery.trim().length > 0 ? (
          <View className="px-6 mb-6">
            <View className="rounded-3xl border border-app/10 bg-input px-4 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-outfit uppercase tracking-[1.6px] text-secondary">
                  Suggestions
                </Text>
                <View className="px-2.5 py-1 rounded-full bg-[#2F8F57]/10">
                  <Text className="text-[10px] font-outfit text-[#2F8F57]">
                    {searchSuggestions.length} result
                    {searchSuggestions.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              {searchSuggestions.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-app/20 bg-white/40 dark:bg-white/5 px-3 py-3">
                  <Text className="text-sm font-outfit text-secondary">
                    No matching sections found.
                  </Text>
                  <Text className="text-xs font-outfit text-secondary mt-1">
                    Try a different keyword or browse the tabs below.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {searchSuggestions.map((item) => {
                    const isSection = item.subtitle === "Section";
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setActiveTab(item.tab);
                          setSearchQuery("");
                        }}
                        className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-white/5 px-3 py-3"
                      >
                        <View className="flex-row items-center gap-3">
                          <View
                            className={`h-9 w-9 rounded-xl items-center justify-center ${
                              isSection ? "bg-[#2F8F57]" : "bg-[#2F8F57]/15"
                            }`}
                          >
                            <Feather
                              name={isSection ? "layers" : "file-text"}
                              size={16}
                              color={isSection ? "white" : "#2F8F57"}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-outfit text-app">
                              {item.title}
                            </Text>
                            <Text className="text-xs font-outfit text-secondary mt-1">
                              {item.subtitle}
                            </Text>
                          </View>
                          <View className="px-2.5 py-1 rounded-full bg-secondary/10">
                            <Text className="text-[10px] font-outfit text-secondary">
                              {item.tab}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View className="px-6">{renderTab()}</View>
      </ThemedScrollView>

      <Modal
        visible={Boolean(activeVideoUrl)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveVideoUrl(null)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-app rounded-t-3xl p-4 pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-clash text-app font-bold">
                Exercise Video
              </Text>
              <TouchableOpacity
                onPress={() => setActiveVideoUrl(null)}
                className="h-10 w-10 rounded-full bg-secondary items-center justify-center"
              >
                <Feather name="x" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {activeVideoUrl ? <VideoPlayer uri={activeVideoUrl} /> : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
