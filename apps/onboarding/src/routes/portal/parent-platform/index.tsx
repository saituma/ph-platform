import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
  isPreview?: boolean | null;
};

type ParentCoursesPayload = {
  items?: ParentCourse[];
};

async function fetchParentCourses(): Promise<ParentCourse[]> {
  const response = await fetch(`/api/content/parent-courses`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch parent platform: ${response.status}`);
  }

  const data = (await response.json()) as ParentCoursesPayload;
  return Array.isArray(data.items) ? data.items : [];
}

export const Route = createFileRoute("/portal/parent-platform/")({
  loader: async ({ context: { queryClient } }) => {
    const status = await getTokenStatus();
    if (status.authenticated) {
      await queryClient.ensureQueryData({
        queryKey: ["parent-platform", "courses", "cookie"],
        queryFn: fetchParentCourses,
      });
    }
  },
  component: ParentPlatformPage,
});

function ParentPlatformPage() {
  const { token, loading: portalLoading, error: portalError } = usePortal();
  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["parent-platform", "courses", token],
    queryFn: fetchParentCourses,
    enabled: !!token && !portalLoading,
    staleTime: 1000 * 60 * 10,
  });

  if (portalLoading || (token && isLoading)) {
    return (
      <PageTransition className="container mx-auto p-4 pb-20 space-y-4">
        <div className="h-8 w-56 animate-pulse bg-muted rounded" />
        <div className="h-4 w-72 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse bg-muted rounded-2xl" />
          ))}
        </div>
      </PageTransition>
    );
  }

  if (portalError || error) {
    return (
      <PageTransition className="container mx-auto p-4 pb-20">
        <p className="text-muted-foreground">
          {portalError ||
            (error instanceof Error ? error.message : "Could not load parent platform")}
        </p>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="container mx-auto p-4 pb-20 space-y-6">
      <div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight">
          Parent <span className="text-primary">Platform</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Same content feed as mobile (`/api/content/parent-courses`).
        </p>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="rounded-2xl border p-6 text-muted-foreground">
          No parent courses available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <a
              key={course.id}
              href={`/portal/parent-platform/${encodeURIComponent(String(course.id))}`}
              className="rounded-2xl border overflow-hidden bg-card block transition hover:border-primary/30 hover:shadow-sm cursor-pointer"
            >
              {course.coverImage ? (
                <div className="w-full h-56 bg-muted/30 p-2">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold leading-tight">{course.title}</h2>
                  {course.isPreview ? (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                      Preview
                    </span>
                  ) : null}
                </div>
                {course.summary ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">{course.summary}</p>
                ) : null}
                <div className="flex items-center gap-2 text-[11px] text-foreground/60 uppercase tracking-wider">
                  {course.category ? <span>{course.category}</span> : null}
                  {course.programTier ? <span>{course.programTier}</span> : null}
                </div>
                <div className="text-sm font-semibold text-primary">Open details</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
