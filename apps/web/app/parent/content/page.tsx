"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, FileText, Video, HelpCircle } from "lucide-react";

import { ParentShell } from "../../../components/parent/shell";
import { ParentCoursesCard } from "../../../components/parent/config/parent-courses-card";
import { useGetParentCoursesQuery } from "../../../lib/apiSlice";
import {
  normalizeModules,
  type ParentCourse,
  type ParentCourseModule,
} from "../../../components/parent/config/parent-course-types";
import { cn } from "../../../lib/utils";

export default function ParentContentPage() {
  const { data, isLoading } = useGetParentCoursesQuery();

  const stats = useMemo(() => {
    const items: ParentCourse[] = (data?.items ?? []) as ParentCourse[];
    const totalCourses = items.length;
    let totalModules = 0;
    const byType = { article: 0, video: 0, pdf: 0, faq: 0 };
    const byCategory: Record<string, number> = {};

    items.forEach((course) => {
      const modules = normalizeModules((course.modules ?? []) as ParentCourseModule[]);
      totalModules += modules.length;
      modules.forEach((m) => {
        if (m.type && m.type in byType) (byType as Record<string, number>)[m.type]++;
      });
      const cat = course.category ?? "Other";
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    });

    return {
      totalCourses,
      totalModules,
      byType,
      byCategory,
      categoriesCount: Object.keys(byCategory).length,
    };
  }, [data]);

  return (
    <ParentShell
      title="Parent Education Content"
      subtitle="Build and manage courses for the parent platform."
      actions={
        <Link
          href="/parent"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Stats overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {isLoading ? "—" : stats.totalCourses}
                </p>
                <p className="text-xs text-muted-foreground">Total courses</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {isLoading ? "—" : stats.totalModules}
                </p>
                <p className="text-xs text-muted-foreground">Total modules</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {isLoading ? "—" : stats.categoriesCount}
                </p>
                <p className="text-xs text-muted-foreground">Categories used</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Modules by type</p>
              <div className="flex flex-wrap gap-2">
                {stats.byType.article > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <FileText className="h-3 w-3" />
                    {stats.byType.article}
                  </span>
                )}
                {stats.byType.video > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <Video className="h-3 w-3" />
                    {stats.byType.video}
                  </span>
                )}
                {stats.byType.pdf > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    PDF {stats.byType.pdf}
                  </span>
                )}
                {stats.byType.faq > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    <HelpCircle className="h-3 w-3" />
                    {stats.byType.faq}
                  </span>
                )}
                {stats.totalModules === 0 && !isLoading && (
                  <span className="text-xs text-muted-foreground">None yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Courses by category</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCategory).map(([name, count]) => (
                <span
                  key={name}
                  className={cn(
                    "rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm",
                    "text-foreground"
                  )}
                >
                  {name} <span className="font-medium text-muted-foreground">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main courses card (full control) */}
        <ParentCoursesCard />
      </div>
    </ParentShell>
  );
}
