import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import React from "react";
import { View } from "react-native";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

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
  const p = useAdminPastel();
  const insets = useAppSafeAreaInsets();

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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: p.pageBg }}>
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

        <SectionLabel label="Start here" color={p.textSecondary} />
        <SupportMetrics />

        <SectionLabel label="Quick actions" color={p.textSecondary} />
        <QuickActions />

        <SectionLabel label="Browse by topic" color={p.textSecondary} />
        <CategoryList
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <ArticleList
          articles={filteredArticles}
          selectedCategory={selectedCategory}
          onReset={handleReset}
        />

        <SectionLabel label="Frequently asked" color={p.textSecondary} />
        <FAQSection
          expandedFaq={expandedFaq}
          setExpandedFaq={setExpandedFaq}
        />

        <HelpFooter />
      </ThemedScrollView>
    </View>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text
      style={{
        marginLeft: 8,
        fontFamily: "Outfit-Bold",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        color,
        fontSize: 12,
        marginBottom: 16,
      }}
    >
      {label}
    </Text>
  );
}
