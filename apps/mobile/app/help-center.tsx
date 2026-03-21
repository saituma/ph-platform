import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { MoreStackHeader } from "@/components/more/MoreStackHeader";
import { Text, TextInput } from "@/components/ScaledText";
import { ThemedScrollView } from "@/components/ThemedScrollView";
import { Shadows } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];
type AppColors = ReturnType<typeof useAppTheme>["colors"];

type HelpCategory = {
  id: string;
  icon: FeatherIconName;
  label: string;
  description: string;
};

type HelpArticle = {
  id: string;
  icon: FeatherIconName;
  categoryId: string;
  categoryLabel: string;
  title: string;
  summary: string;
  highlights: string[];
  keywords: string[];
  actionLabel?: string;
  actionRoute?: string;
};

type QuickAction = {
  id: string;
  icon: FeatherIconName;
  label: string;
  description: string;
  route: string;
};

type FaqItemType = {
  id: string;
  question: string;
  answer: string;
};

const HELP_CATEGORIES: HelpCategory[] = [
  { id: "all", icon: "grid", label: "All topics", description: "Browse every guide in one place." },
  { id: "account", icon: "user", label: "Account", description: "Profile, guardians, and sign-in basics." },
  { id: "training", icon: "activity", label: "Training", description: "Programs, schedules, and video review help." },
  { id: "billing", icon: "credit-card", label: "Billing", description: "Membership, renewals, and plan updates." },
  { id: "security", icon: "shield", label: "Security", description: "Passwords, privacy, and permissions." },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "feedback",
    icon: "message-square",
    label: "Message support",
    description: "Best for billing, bugs, scheduling changes, and account issues.",
    route: "/feedback",
  },
  {
    id: "permissions",
    icon: "smartphone",
    label: "Check permissions",
    description: "Fix notifications, camera, and media access fast.",
    route: "/permissions",
  },
  {
    id: "privacy",
    icon: "lock",
    label: "Privacy & safety",
    description: "Review data handling and account protection details.",
    route: "/privacy-policy",
  },
];

const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "reset-password",
    icon: "key",
    categoryId: "security",
    categoryLabel: "Security",
    title: "Resetting your password safely",
    summary: "If you lose access, act quickly and update shared guardian credentials after you get back in.",
    highlights: [
      "Try a normal sign-in first to rule out a saved-password mismatch.",
      "If access still fails, send support a short message from the app so they can verify your account.",
      "Use a strong new password and avoid reusing one from another service.",
    ],
    keywords: ["password", "login", "sign in", "access", "reset"],
    actionLabel: "Open support message",
    actionRoute: "/feedback",
  },
  {
    id: "training-plan",
    icon: "calendar",
    categoryId: "training",
    categoryLabel: "Training",
    title: "Changing a training plan or schedule",
    summary: "The fastest requests include the athlete name, week affected, and the exact session that needs attention.",
    highlights: [
      "Mention whether the issue is a missed session, wrong plan, or timing conflict.",
      "Include any recent changes that happened before the problem showed up.",
      "Premium members can reference uploaded training videos for extra context.",
    ],
    keywords: ["training", "schedule", "program", "calendar", "session"],
    actionLabel: "Contact support",
    actionRoute: "/feedback",
  },
  {
    id: "family-members",
    icon: "users",
    categoryId: "account",
    categoryLabel: "Account",
    title: "Managing guardian and athlete details",
    summary: "Keep names, emails, and linked household access up to date so the right person gets updates.",
    highlights: [
      "Review profile details after new enrollments or season changes.",
      "Use one active email per guardian to reduce missed communication.",
      "When you request help, include both athlete and guardian names together.",
    ],
    keywords: ["family", "guardian", "athlete", "profile", "account"],
    actionLabel: "Open profile settings",
    actionRoute: "/profile-settings",
  },
  {
    id: "notifications",
    icon: "bell",
    categoryId: "security",
    categoryLabel: "Security",
    title: "Fixing notifications, camera, or upload access",
    summary: "Most device issues are caused by app permissions being disabled after an update or reinstall.",
    highlights: [
      "Check notifications, camera, and media permissions in the app settings flow.",
      "Re-open the app after changing permissions so access refreshes cleanly.",
      "If uploads still fail, share the device type and what happened before the issue.",
    ],
    keywords: ["notifications", "camera", "upload", "permissions", "media"],
    actionLabel: "Review permissions",
    actionRoute: "/permissions",
  },
  {
    id: "billing-plan",
    icon: "credit-card",
    categoryId: "billing",
    categoryLabel: "Billing",
    title: "Membership, renewals, and plan questions",
    summary: "Billing help moves faster when you share the plan name, renewal date, and the email linked to the account.",
    highlights: [
      "Mention whether you need an upgrade, renewal check, or payment support.",
      "Never send full card details through the app.",
      "Attach screenshots only if they do not reveal private payment information.",
    ],
    keywords: ["billing", "payment", "membership", "plan", "renewal"],
    actionLabel: "Message billing support",
    actionRoute: "/feedback",
  },
  {
    id: "video-review",
    icon: "video",
    categoryId: "training",
    categoryLabel: "Training",
    title: "Uploading a training video for review",
    summary: "A clear angle, good lighting, and one line of context make coach feedback much more useful.",
    highlights: [
      "Keep the athlete fully in frame and record in steady light.",
      "Add a short note about the drill or movement you want reviewed.",
      "Premium members can upload from the More tab when access is enabled.",
    ],
    keywords: ["video", "review", "upload", "premium", "coach"],
    actionLabel: "Go to support",
    actionRoute: "/feedback",
  },
];

const FAQS: FaqItemType[] = [
  {
    id: "response-time",
    question: "How quickly should I expect a reply?",
    answer: "Most support requests are answered within one business day. Clear details like athlete name, device, and what changed usually speed things up.",
  },
  {
    id: "best-channel",
    question: "When should I use support instead of app settings?",
    answer: "Use app settings for things you can update yourself, like permissions and profile details. Use support for billing issues, sign-in problems, plan changes, or anything that needs coach or admin review.",
  },
  {
    id: "what-to-send",
    question: "What details help support solve an issue faster?",
    answer: "Share the athlete name, a short summary of the issue, what you expected to happen, and any screenshot that does not expose private information.",
  },
];

const POPULAR_SEARCHES = ["password", "schedule", "billing", "notifications"];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(FAQS[0]?.id ?? null);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return HELP_ARTICLES.filter((article) => {
      const matchesCategory = selectedCategory === "all" || article.categoryId === selectedCategory;
      const haystack = [
        article.title,
        article.summary,
        article.categoryLabel,
        article.keywords.join(" "),
        article.highlights.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!query || haystack.includes(query));
    });
  }, [searchQuery, selectedCategory]);

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
        <View
          className="mb-8 overflow-hidden rounded-[30px] border p-5"
          style={{
            backgroundColor: isDark ? colors.cardElevated : "#F7FFF9",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <View
            className="absolute -right-10 -top-8 h-24 w-24 rounded-full"
            style={{ backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.12)" }}
          />
          <View
            className="absolute -bottom-8 left-8 h-20 w-20 rounded-full"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)" }}
          />

          <View className="mb-5">
            <Text className="text-3xl font-telma-bold text-app mb-2">How can we help?</Text>
            <Text className="text-base font-outfit text-secondary leading-relaxed">
              Find quick answers, learn the best next step, and get the right details ready before you contact the team.
            </Text>
          </View>

          <View className="flex-row items-center bg-input border border-app rounded-2xl px-4 py-3">
            <Feather name="search" size={18} className="text-secondary mr-3" />
            <TextInput
              placeholder="Search help topics, billing, notifications..."
              className="flex-1 font-outfit text-app"
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="ml-3 h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)" }}
              >
                <Feather name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <TouchableOpacity
                key={term}
                onPress={() => setSearchQuery(term)}
                className="rounded-full border px-3 py-2"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.82)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                }}
              >
                <Text className="font-outfit text-xs font-bold uppercase tracking-[1.2px]" style={{ color: colors.textSecondary }}>
                  {term}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <SectionLabel label="Start here" />
        <View className="mb-8 flex-row gap-3">
          <SupportMetric
            title="Best first step"
            value="Send a clear message"
            caption="Include athlete name, device, and what changed."
            isDark={isDark}
            colors={colors}
          />
          <SupportMetric
            title="Typical reply"
            value="Within 1 business day"
            caption="Detailed requests are usually solved faster."
            isDark={isDark}
            colors={colors}
          />
        </View>

        <SectionLabel label="Quick actions" />
        <View className="mb-8 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.id}
              icon={action.icon}
              label={action.label}
              description={action.description}
              onPress={() => router.push(action.route as never)}
              isDark={isDark}
              colors={colors}
            />
          ))}
        </View>

        <SectionLabel label="Browse by topic" />
        <View className="flex-row flex-wrap justify-between mb-8">
          {HELP_CATEGORIES.map((category) => (
            <HelpCategoryCard
              key={category.id}
              icon={category.icon}
              label={category.label}
              description={category.description}
              isActive={selectedCategory === category.id}
              onPress={() => setSelectedCategory(category.id)}
              isDark={isDark}
              colors={colors}
            />
          ))}
        </View>

        <View className="mb-4 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <SectionLabel label="Recommended guides" compact />
            <Text className="mt-2 font-outfit text-sm text-secondary leading-relaxed">
              {filteredArticles.length} result{filteredArticles.length === 1 ? "" : "s"}
              {selectedCategory !== "all" ? " in this topic" : " ready to browse"}.
            </Text>
          </View>
          {selectedCategory !== "all" || searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
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
          {filteredArticles.length ? (
            filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onPressAction={() => {
                  if (article.actionRoute) {
                    router.push(article.actionRoute as never);
                  }
                }}
                isDark={isDark}
                colors={colors}
              />
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

        <SectionLabel label="Frequently asked" />
        <View className="mb-8 gap-3">
          {FAQS.map((item) => {
            const isOpen = expandedFaq === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setExpandedFaq(isOpen ? null : item.id)}
                className="rounded-[24px] border p-5"
                style={{
                  backgroundColor: colors.card,
                  borderColor: isOpen ? colors.accent : isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
                  ...(isDark ? Shadows.none : Shadows.sm),
                }}
                activeOpacity={0.9}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: isOpen ? colors.accentLight : isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}>
                    <Feather name={isOpen ? "minus" : "plus"} size={18} color={colors.accent} />
                  </View>
                  <Text className="flex-1 font-outfit text-base font-bold text-app leading-6">{item.question}</Text>
                </View>

                {isOpen ? (
                  <Text className="mt-4 font-outfit text-sm text-secondary leading-6">{item.answer}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          className="mb-6 overflow-hidden rounded-[30px] border p-5"
          style={{
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
            ...(isDark ? Shadows.none : Shadows.md),
          }}
        >
          <Text className="font-clash text-2xl text-app mb-2">Still need a hand?</Text>
          <Text className="font-outfit text-sm text-secondary leading-6 mb-5">
            For the fastest support, include the athlete name, device type, and a short description of what changed right before the issue started.
          </Text>

          <ActionButton
            label="Contact Support"
            onPress={() => router.push("/feedback")}
            color="bg-accent"
            icon="message-square"
            fullWidth={true}
          />
        </View>
      </ThemedScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <Text className={`ml-2 font-outfit font-bold uppercase tracking-wider text-secondary ${compact ? "text-[11px] mb-0" : "text-xs mb-4"}`}>
      {label}
    </Text>
  );
}

function HelpCategoryCard({
  icon,
  label,
  description,
  isActive,
  onPress,
  isDark,
  colors,
}: {
  icon: FeatherIconName;
  label: string;
  description: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: AppColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-4 w-[48%] rounded-[28px] border p-4"
      style={{
        backgroundColor: isActive ? (isDark ? "rgba(34,197,94,0.16)" : "#F0FDF4") : colors.card,
        borderColor: isActive ? colors.accent : isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
      activeOpacity={0.9}
    >
      <View
        className="mb-3 h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: isActive ? colors.accentLight : isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)" }}
      >
        <Feather name={icon} size={22} color={colors.accent} />
      </View>
      <Text className="font-clash text-lg font-bold text-app mb-1">{label}</Text>
      <Text className="font-outfit text-sm text-secondary leading-5">{description}</Text>
    </TouchableOpacity>
  );
}

function SupportMetric({
  title,
  value,
  caption,
  isDark,
  colors,
}: {
  title: string;
  value: string;
  caption: string;
  isDark: boolean;
  colors: AppColors;
}) {
  return (
    <View
      className="flex-1 rounded-[26px] border p-4"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
    >
      <Text className="font-outfit text-[11px] font-bold uppercase tracking-[1.2px] text-secondary mb-2">{title}</Text>
      <Text className="font-clash text-xl text-app mb-2">{value}</Text>
      <Text className="font-outfit text-sm text-secondary leading-5">{caption}</Text>
    </View>
  );
}

function QuickActionCard({
  icon,
  label,
  description,
  onPress,
  isDark,
  colors,
}: {
  icon: FeatherIconName;
  label: string;
  description: string;
  onPress: () => void;
  isDark: boolean;
  colors: AppColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center rounded-[26px] border p-4"
      style={{
        backgroundColor: colors.card,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.sm),
      }}
      activeOpacity={0.9}
    >
      <View
        className="mr-4 h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : colors.accentLight }}
      >
        <Feather name={icon} size={20} color={colors.accent} />
      </View>

      <View className="flex-1">
        <Text className="font-clash text-lg text-app mb-1">{label}</Text>
        <Text className="font-outfit text-sm text-secondary leading-5">{description}</Text>
      </View>

      <Feather name="chevron-right" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function ArticleCard({
  article,
  onPressAction,
  isDark,
  colors,
}: {
  article: HelpArticle;
  onPressAction: () => void;
  isDark: boolean;
  colors: AppColors;
}) {
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
          <Feather name={article.icon} size={20} color={colors.accent} />
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
          onPress={onPressAction}
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