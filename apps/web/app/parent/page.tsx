"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookOpen, Users, ChevronRight } from "lucide-react";

import { ParentShell } from "../../components/parent/shell";
import { useGetParentCoursesQuery } from "../../lib/apiSlice";
import { useGetUsersQuery } from "../../lib/apiSlice";
import { cn } from "../../lib/utils";

const CONFIG_CARDS = [
  {
    id: "content",
    href: "/parent/content",
    title: "Parent Education Content",
    description: "Build and manage courses with articles, videos, PDFs, and FAQs for parents.",
    icon: BookOpen,
    color: "from-violet-500/20 to-purple-600/20 border-violet-500/30 hover:border-violet-500/60",
    iconBg: "bg-violet-500/20 text-violet-600 dark:text-violet-400",
  },
  {
    id: "completed",
    href: "/parent/completed",
    title: "Completed Onboarding",
    description: "View guardians who completed onboarding and their submitted details.",
    icon: Users,
    color: "from-blue-500/20 to-indigo-600/20 border-blue-500/30 hover:border-blue-500/60",
    iconBg: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  },
];

export default function ParentDashboardPage() {
  const { data: coursesData } = useGetParentCoursesQuery();
  const { data: usersData } = useGetUsersQuery();

  const stats = useMemo(() => {
    const courses = coursesData?.items ?? [];
    const totalModules = courses.reduce(
      (sum: number, c: { modules?: unknown[] }) => sum + (c.modules?.length ?? 0),
      0
    );
    const users = usersData?.users ?? [];
    const completedGuardians = users.filter(
      (u: { onboardingCompleted?: boolean; role?: string }) =>
        u.onboardingCompleted && u.role === "guardian"
    );
    return {
      courses: courses.length,
      totalModules,
      completedGuardians: completedGuardians.length,
    };
  }, [coursesData, usersData]);

  const getStat = (id: string) => {
    if (id === "content") return `${stats.courses} courses · ${stats.totalModules} modules`;
    if (id === "completed") return `${stats.completedGuardians} guardians`;
    return null;
  };

  return (
    <ParentShell
      title="Parent Portal"
      subtitle="Admin control for parent-facing content and settings."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {CONFIG_CARDS.map((card) => {
          const Icon = card.icon;
          const stat = getStat(card.id);
          return (
            <Link
              key={card.id}
              href={card.href}
              className={cn(
                "group relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200",
                "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                card.color
              )}
            >
              <div className="flex flex-1 flex-col">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      card.iconBg
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{card.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                {stat ? (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">{stat}</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </ParentShell>
  );
}
