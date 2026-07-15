"use client";

import type { ReactNode } from "react";

type SplitPaneShellProps = {
  /** Whether a detail pane (thread/group) is currently open — controls which side shows on mobile. */
  isDetailOpen: boolean;
  list: ReactNode;
  detail: ReactNode;
};

/** Shared list/detail split-pane layout: full-width list on mobile until something is
 * selected, side-by-side from `lg:` up. Used by Inbox and Teams so a responsive fix
 * in one place applies to both. */
export function SplitPaneShell({ isDetailOpen, list, detail }: SplitPaneShellProps) {
  return (
    <div className="flex h-[calc(100svh-10rem)] overflow-hidden rounded-xl border border-border bg-background">
      <div
        className={`flex flex-col border-r border-border bg-background ${
          isDetailOpen
            ? "hidden lg:flex lg:w-[340px] xl:w-[380px]"
            : "flex w-full lg:w-[340px] xl:w-[380px]"
        }`}
      >
        {list}
      </div>
      <div className={`flex flex-1 flex-col overflow-hidden ${isDetailOpen ? "flex" : "hidden lg:flex"}`}>
        {detail}
      </div>
    </div>
  );
}
