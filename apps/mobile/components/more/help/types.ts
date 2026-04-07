import { Feather } from "@expo/vector-icons";

export type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export type HelpCategory = {
  id: string;
  icon: FeatherIconName;
  label: string;
  description: string;
};

export type HelpArticle = {
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

export type QuickAction = {
  id: string;
  icon: FeatherIconName;
  label: string;
  description: string;
  route: string;
};

export type FaqItemType = {
  id: string;
  question: string;
  answer: string;
};
