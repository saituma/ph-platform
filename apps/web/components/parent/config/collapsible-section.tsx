"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";

type CollapsibleSectionProps = {
  id: string;
  title: string;
  openSection: string | null;
  onToggle: (id: string | null) => void;
  children: React.ReactNode;
};

export function CollapsibleSection({
  id,
  title,
  openSection,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const isOpen = openSection === id;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          onClick={() => onToggle(isOpen ? null : id)}
        >
          <ChevronDown className={cn("h-4 w-4 transition", isOpen ? "rotate-180" : "")} />
        </Button>
      </div>
      {isOpen ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
}
