export type HelpCategory = {
  id: string;
  icon: string;
  label: string;
  description: string;
};

export type HelpArticle = {
  id: string;
  icon: string;
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
  icon: string;
  label: string;
  description: string;
  route: string;
};

export type FaqItemType = {
  id: string;
  question: string;
  answer: string;
};
