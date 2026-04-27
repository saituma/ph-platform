import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import React from "react";
import { View } from "react-native";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { fonts } from "@/constants/theme";

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
  const { isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";

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
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: isDark ? "hsl(220, 8%, 6%)" : "hsl(220, 15%, 98%)" }}>
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

        <SectionLabel label="Start here" color={labelColor} />
        <SupportMetrics />

        <SectionLabel label="Quick actions" color={labelColor} />
        <QuickActions />

        <SectionLabel label="Browse by topic" color={labelColor} />
        <CategoryList
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <ArticleList
          articles={filteredArticles}
          selectedCategory={selectedCategory}
          onReset={handleReset}
        />

        <SectionLabel label="Frequently asked" color={labelColor} />
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
        fontFamily: fonts.bodyBold,
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
