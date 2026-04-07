import { useMemo, useState } from "react";
import { HELP_ARTICLES, FAQS } from "../constants";

export function useHelpCenter() {
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

  const handleReset = () => {
    setSelectedCategory("all");
    setSearchQuery("");
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    expandedFaq,
    setExpandedFaq,
    filteredArticles,
    handleReset,
  };
}
