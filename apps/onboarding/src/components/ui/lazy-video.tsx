import { useEffect, useRef, useState } from "react";
import { cn } from "#/lib/utils";

type LazyVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
};

export function LazyVideo({
  src,
  poster,
  className,
  autoPlay = false,
  muted = true,
  loop = true,
  playsInline = true,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={isInView ? src : undefined}
      poster={poster}
      autoPlay={autoPlay && isInView}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload="none"
      className={cn("", className)}
    />
  );
}
