import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { settingsService } from "@/services/settingsService";
import { usePortalSocketEvent } from "@/portal/PortalSocketContext";

type Story = {
  id: number;
  title: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  badge?: string | null;
  viewed: boolean;
  createdAt: string;
};

const STORY_DURATION = 6000;

function StoryCircle({
  story,
  onClick,
}: {
  story: Story;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
    >
      <div
        className={`p-[2.5px] rounded-full ${
          story.viewed
            ? "bg-foreground/15"
            : "bg-gradient-to-br from-primary via-orange-500 to-amber-400"
        }`}
      >
        <div className="rounded-full p-[2px] bg-background">
          <img
            src={story.mediaUrl}
            alt={story.title}
            className="w-16 h-16 rounded-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      </div>
      {story.badge && (
        <span className="absolute mt-[60px] bg-primary text-primary-foreground font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
          {story.badge}
        </span>
      )}
      <span className="text-[11px] text-muted-foreground truncate max-w-[72px] text-center font-medium">
        {story.title}
      </span>
    </button>
  );
}

function ProgressBar({
  isActive,
  isCompleted,
  duration,
}: {
  isActive: boolean;
  isCompleted: boolean;
  duration: number;
}) {
  return (
    <div className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
      <div
        className={`h-full bg-white rounded-full ${isActive ? "animate-progress" : ""}`}
        style={{
          width: isCompleted ? "100%" : isActive ? "100%" : "0%",
          animationDuration: isActive ? `${duration}ms` : undefined,
        }}
      />
    </div>
  );
}

function StoryViewer({
  stories,
  initialIndex,
  onClose,
  onViewed,
}: {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onViewed: (id: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const story = stories[activeIndex];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goNext = useCallback(() => {
    clearTimer();
    if (activeIndex < stories.length - 1) {
      setActiveIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [activeIndex, stories.length, clearTimer, onClose]);

  const goPrev = useCallback(() => {
    clearTimer();
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }
  }, [activeIndex, clearTimer]);

  const startTimer = useCallback(() => {
    if (story?.mediaType === "video") return;
    clearTimer();
    timerRef.current = setTimeout(goNext, STORY_DURATION);
  }, [story, clearTimer, goNext]);

  useEffect(() => {
    startTimer();
    if (story && !story.viewed) {
      onViewed(story.id);
    }
    return clearTimer;
  }, [activeIndex, startTimer, clearTimer, story, onViewed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!story) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onClick={(e) => {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width / 3) {
            goPrev();
          } else {
            goNext();
          }
        }}
      >
        {/* Progress bars */}
        <div className="absolute top-[env(safe-area-inset-top,12px)] left-0 right-0 flex gap-1 px-3 pt-3 z-20">
          {stories.map((s, i) => (
            <ProgressBar
              key={s.id}
              isActive={i === activeIndex}
              isCompleted={i < activeIndex}
              duration={STORY_DURATION}
            />
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-[calc(env(safe-area-inset-top,12px)+20px)] left-0 right-0 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">{story.title}</span>
            {story.badge && (
              <span className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                {story.badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-white hover:text-white/70 transition-colors cursor-pointer"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        {/* Nav arrows (desktop) */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        {activeIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}

        {/* Media */}
        <div className="w-full h-full max-w-lg max-h-[90vh] relative mx-auto">
          {story.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted={false}
              onEnded={goNext}
            />
          ) : (
            <motion.img
              key={story.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              src={story.mediaUrl}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function StoriesRow() {
  const queryClient = useQueryClient();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await settingsService.getStories();
      return res.items ?? [];
    },
    staleTime: 60_000,
  });

  usePortalSocketEvent("story:changed", () => {
    queryClient.invalidateQueries({ queryKey: ["stories"] });
  });

  const handleViewed = useCallback(
    (storyId: number) => {
      settingsService.markStoryViewed(storyId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["stories"] });
      });
    },
    [queryClient],
  );

  if (!stories.length) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border border-foreground/[0.06] p-4 hover:border-foreground/[0.1] transition-colors duration-300"
      >
        <div className="flex items-center gap-2 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
            Stories
          </p>
          {stories.some((s) => !s.viewed) && (
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
          )}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {stories.map((story, i) => (
            <StoryCircle
              key={story.id}
              story={story}
              onClick={() => setViewerIndex(i)}
            />
          ))}
        </div>
      </motion.div>

      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onViewed={handleViewed}
        />
      )}

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress linear forwards;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
