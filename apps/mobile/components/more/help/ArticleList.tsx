import React from "react";
import { Pressable, View } from "react-native";
import { Key, Calendar, Users, Bell, Video, Search, Check, ArrowRight, MessageSquare } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { HelpArticle } from "./types";
import { useRouter } from "expo-router";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  key: Key,
  calendar: Calendar,
  users: Users,
  bell: Bell,
  video: Video,
  search: Search,
};

function ArticleCard({ article }: { article: HelpArticle }) {
  const router = useRouter();
  const p = useAdminPastel();
  const Icon = ICON_MAP[article.icon] || Search;

  return (
    <View
      style={{
        borderRadius: 22,
        padding: 20,
        backgroundColor: p.cardWhite,
      }}
    >
      <View style={{ marginBottom: 16, flexDirection: "row", gap: 12 }}>
        <View
          style={{
            height: 48,
            width: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            backgroundColor: p.inputBg,
          }}
        >
          <Icon size={20} color={p.accent} />
        </View>

        <View style={{ flex: 1 }}>
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: 100,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginBottom: 8,
              backgroundColor: p.inputBg,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: p.accent,
              }}
            >
              {article.categoryLabel}
            </Text>
          </View>
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, marginBottom: 8, lineHeight: 24 }}>
            {article.title}
          </Text>
          <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 20 }}>
            {article.summary}
          </Text>
        </View>
      </View>

      <View style={{ gap: 12, marginBottom: 16 }}>
        {article.highlights.map((highlight) => (
          <View key={highlight} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View
              style={{
                marginTop: 2,
                height: 20,
                width: 20,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 100,
                backgroundColor: p.successSoft,
              }}
            >
              <Check size={12} color={p.success} />
            </View>
            <Text style={{ flex: 1, fontFamily: "Outfit-Regular", fontSize: 13, color: p.textPrimary, lineHeight: 20 }}>
              {highlight}
            </Text>
          </View>
        ))}
      </View>

      {article.actionLabel ? (
        <Pressable
          onPress={() => article.actionRoute && router.push(article.actionRoute as never)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: p.inputBg,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: "Outfit-Bold", fontSize: 13, color: p.accent }}>
            {article.actionLabel}
          </Text>
          <ArrowRight size={16} color={p.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ArticleList({ articles, selectedCategory, onReset }: { articles: HelpArticle[]; selectedCategory: string; onReset: () => void }) {
  const p = useAdminPastel();

  return (
    <View>
      <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              color: p.textSecondary,
              marginLeft: 8,
            }}
          >
            Recommended guides
          </Text>
          <Text style={{ marginTop: 8, fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary }}>
            {articles.length} result{articles.length === 1 ? "" : "s"}
            {selectedCategory !== "all" ? " in this topic" : " ready to browse"}.
          </Text>
        </View>
        {selectedCategory !== "all" ? (
          <Pressable
            onPress={onReset}
            style={{
              borderRadius: 100,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: p.cardWhite,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: p.accent,
              }}
            >
              Reset
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginBottom: 24, gap: 16 }}>
        {articles.length ? (
          articles.map((article) => <ArticleCard key={article.id} article={article} />)
        ) : (
          <View
            style={{
              borderRadius: 22,
              padding: 20,
              backgroundColor: p.cardWhite,
            }}
          >
            <View
              style={{
                marginBottom: 12,
                height: 48,
                width: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: p.inputBg,
              }}
            >
              <Search size={20} color={p.accent} />
            </View>
            <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, marginBottom: 8 }}>
              No direct matches yet
            </Text>
            <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary, lineHeight: 20, marginBottom: 16 }}>
              Try a broader term like password, schedule, or notifications. You can also message support directly.
            </Text>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 100,
                backgroundColor: p.accent,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <MessageSquare size={18} color={p.buttonPrimaryText} />
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.buttonPrimaryText }}>
                Contact Support
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
