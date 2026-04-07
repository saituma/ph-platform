import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Shadows } from "@/constants/theme";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { HelpArticle } from "./types";
import { useRouter } from "expo-router";

interface ArticleListProps {
  articles: HelpArticle[];
  selectedCategory: string;
  onReset: () => void;
}

function ArticleCard({ article }: { article: HelpArticle }) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View
      className="rounded-[28px] border p-5"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <View className="mb-4 flex-row items-start gap-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}
        >
          <Feather name={article.icon as any} size={20} color={colors.accent} />
        </View>

        <View className="flex-1">
          <View className="self-start rounded-full px-3 py-1.5 mb-2" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
            <Text className="font-outfit text-[10px] font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
              {article.categoryLabel}
            </Text>
          </View>
          <Text className="font-clash text-xl text-app mb-2 leading-6">{article.title}</Text>
          <Text className="font-outfit text-sm text-secondary leading-6">{article.summary}</Text>
        </View>
      </View>

      <View className="gap-3 mb-4">
        {article.highlights.map((highlight) => (
          <View key={highlight} className="flex-row items-start gap-3">
            <View className="mt-1 h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(34,197,94,0.12)" }}>
              <Feather name="check" size={12} color={colors.accent} />
            </View>
            <Text className="flex-1 font-outfit text-sm text-app leading-6">{highlight}</Text>
          </View>
        ))}
      </View>

      {article.actionLabel ? (
        <TouchableOpacity
          onPress={() => article.actionRoute && router.push(article.actionRoute as never)}
          className="flex-row items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}
          activeOpacity={0.9}
        >
          <Text className="font-outfit text-sm font-bold" style={{ color: colors.accent }}>
            {article.actionLabel}
          </Text>
          <Feather name="arrow-right" size={16} color={colors.accent} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ArticleList({ articles, selectedCategory, onReset }: ArticleListProps) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View>
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="ml-2 font-outfit font-bold uppercase tracking-wider text-secondary text-[11px]">
            Recommended guides
          </Text>
          <Text className="mt-2 font-outfit text-sm text-secondary leading-relaxed">
            {articles.length} result{articles.length === 1 ? "" : "s"}
            {selectedCategory !== "all" ? " in this topic" : " ready to browse"}.
          </Text>
        </View>
        {selectedCategory !== "all" ? (
          <TouchableOpacity
            onPress={onReset}
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}
          >
            <Text className="font-outfit text-xs font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
              Reset
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mb-8 gap-4">
        {articles.length ? (
          articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))
        ) : (
          <View
            className="rounded-[28px] border p-5"
            style={{
              backgroundColor: colors.card,
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
              ...(isDark ? Shadows.none : Shadows.sm),
            }}
          >
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}>
              <Feather name="search" size={20} color={colors.accent} />
            </View>
            <Text className="font-clash text-xl text-app mb-2">No direct matches yet</Text>
            <Text className="font-outfit text-sm text-secondary leading-relaxed mb-4">
              Try a broader term like password, schedule, billing, or notifications. You can also message support directly.
            </Text>
            <ActionButton
              label="Contact Support"
              onPress={() => router.push("/feedback")}
              color="bg-accent"
              icon="message-square"
              fullWidth={true}
            />
          </View>
        )}
      </View>
    </View>
  );
}
