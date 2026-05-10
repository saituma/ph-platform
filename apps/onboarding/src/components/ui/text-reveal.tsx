"use client";

import { type FC, useRef, useEffect, useState, useCallback } from "react";

import { cn } from "#/lib/utils.ts";

interface TextRevealByWordProps {
  text: string;
  className?: string;
}

const TextRevealByWord: FC<TextRevealByWordProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const enterPoint = window.innerHeight;
    const exitPoint = 0;
    const rawProgress = (enterPoint - rect.top) / (enterPoint - exitPoint);
    setProgress(Math.max(0, Math.min(1, rawProgress)));
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const words = text.split(" ");

  return (
    <div ref={containerRef} className={cn("relative z-0 h-[80vh]", className)}>
      <div className="sticky top-0 mx-auto flex h-[80vh] max-w-4xl items-center px-4 py-12">
        <p className="flex flex-wrap p-5 text-2xl font-bold md:p-8 md:text-3xl lg:p-10 lg:text-4xl xl:text-5xl">
          {words.map((word, i) => {
            const wordProgress = i / words.length;
            const wordEnd = (i + 1) / words.length;
            const opacity = Math.max(
              0,
              Math.min(1, (progress - wordProgress) / (wordEnd - wordProgress))
            );
            return (
              <span key={i} className="relative mx-1 lg:mx-2.5">
                <span className="text-white/10">{word}</span>
                <span
                  className="absolute inset-0 text-white"
                  style={{ opacity }}
                >
                  {word}
                </span>
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
};

export { TextRevealByWord };
