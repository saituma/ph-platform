import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getTokenStatus } from "@/lib/client-storage";
import { PageTransition } from "@/lib/motion";
import { usePortal } from "@/portal/PortalContext";

type ParentCourse = {
  id: number;
  title: string;
  summary?: string | null;
  description?: string | null;
  coverImage?: string | null;
  category?: string | null;
  programTier?: string | null;
  modules?: Array<{
    id: string;
    title: string;
    type: "article" | "video" | "pdf" | "faq";
    content?: string | null;
    mediaUrl?: string | null;
    order?: number;
  }>;
};

type ParentCoursePayload = {
  item?: ParentCourse | null;
};

async function fetchParentCourse(courseId: string): Promise<ParentCourse | null> {
  const response = await fetch(`/api/content/parent-courses/${courseId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch parent course: ${response.status}`);
  }

  const data = (await response.json()) as ParentCoursePayload;
  return data.item ?? null;
}

export const Route = createFileRoute("/portal/parent-platform/$courseId")({
  loader: async ({ params, context: { queryClient } }) => {
    const status = await getTokenStatus();
    if (status.authenticated) {
      await queryClient.ensureQueryData({
        queryKey: ["parent-platform", "course", params.courseId, "cookie"],
        queryFn: () => fetchParentCourse(params.courseId),
      });
    }
  },
  component: ParentPlatformCourseDetailPage,
});

function ParentPlatformCourseDetailPage() {
  const { courseId } = Route.useParams();
  const { token, loading: portalLoading, error: portalError } = usePortal();
  const { data, isLoading, error } = useQuery({
    queryKey: ["parent-platform", "course", courseId, token],
    queryFn: () => fetchParentCourse(courseId),
    enabled: !!token && !portalLoading,
    staleTime: 1000 * 60 * 10,
  });

  if (portalLoading || (token && isLoading)) {
    return (
      <PageTransition className="container mx-auto p-4 pb-20 space-y-4">
        <div className="h-4 w-28 animate-pulse bg-muted rounded" />
        <div className="h-8 w-64 animate-pulse bg-muted rounded" />
        <div className="h-64 w-full animate-pulse bg-muted rounded-2xl" />
      </PageTransition>
    );
  }

  if (portalError || error || !data) {
    return (
      <PageTransition className="container mx-auto p-4 pb-20 space-y-4">
        <Link
          to="/portal/parent-platform"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Parent Platform
        </Link>
        <p className="text-muted-foreground">
          {portalError ||
            (error instanceof Error ? error.message : "Course not found")}
        </p>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="container mx-auto p-4 pb-20 space-y-6">
      <Link
        to="/portal/parent-platform"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Parent Platform
      </Link>

      {data.coverImage ? (
        <div className="w-full max-h-[480px] rounded-2xl border bg-muted/30 p-2">
          <img
            src={data.coverImage}
            alt={data.title}
            className="w-full max-h-[460px] object-contain"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <h1 className="text-3xl font-black italic uppercase tracking-tight">{data.title}</h1>
        {data.summary ? <p className="text-muted-foreground">{data.summary}</p> : null}
        <div className="flex items-center gap-2 text-[11px] text-foreground/60 uppercase tracking-wider">
          {data.category ? <span>{data.category}</span> : null}
          {data.programTier ? <span>{data.programTier}</span> : null}
        </div>
      </div>

      {data.description ? (
        <section className="rounded-2xl border p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-2">Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/70">Modules</h2>
        {!data.modules || data.modules.length === 0 ? (
          <div className="rounded-2xl border p-4 text-sm text-muted-foreground">No modules available.</div>
        ) : (
          <div className="space-y-3">
            {data.modules
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((module, index) => (
                <article key={`${module.id}-${index}`} className="rounded-2xl border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">{module.title}</h3>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-muted uppercase tracking-wider">
                      {module.type}
                    </span>
                  </div>
                  {module.content ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{module.content}</p>
                  ) : null}
                  {module.mediaUrl ? (
                    <a
                      href={module.mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Open resource
                    </a>
                  ) : null}
                </article>
              ))}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
