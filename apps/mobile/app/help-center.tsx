import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHelpCenter } from "@/components/more/help/hooks/useHelpCenter";
import { SearchHeader } from "@/components/more/help/SearchHeader";
import { SupportMetrics } from "@/components/more/help/SupportMetrics";
import { QuickActions } from "@/components/more/help/QuickActions";
import { CategoryList } from "@/components/more/help/CategoryList";
import { ArticleList } from "@/components/more/help/ArticleList";
import { FAQSection } from "@/components/more/help/FAQSection";
import { HelpFooter } from "@/components/more/help/HelpFooter";
import { Text } from "@/components/ScaledText";

export default function HelpCenterScreen() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    expandedFaq,
    setExpandedFaq,
    filteredArticles,
    handleReset,
  } = useHelpCenter();

  return (
    <SafeAreaView className="flex-1 bg-app" edges={["top"]}>
      <MoreStackHeader
        title="Help Center"
        subtitle="Search answers, browse common topics, and take the fastest route to support."
        badge="Support"
      />

      <ThemedScrollView
        onRefresh={async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 56,
        }}
      >
        <SearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <SectionLabel label="Start here" />
        <SupportMetrics />

        <SectionLabel label="Quick actions" />
        <QuickActions />

        <SectionLabel label="Browse by topic" />
        <CategoryList
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <ArticleList
          articles={filteredArticles}
          selectedCategory={selectedCategory}
          onReset={handleReset}
        />

        <SectionLabel label="Frequently asked" />
        <FAQSection
          expandedFaq={expandedFaq}
          setExpandedFaq={setExpandedFaq}
        />

        <HelpFooter />
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="ml-2 font-outfit font-bold uppercase tracking-wider text-secondary text-xs mb-4">
      {label}
    </Text>
  );
}
