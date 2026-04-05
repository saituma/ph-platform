"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { buttonVariants } from "./button";
import { cn } from "../../lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-3",
        caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(buttonVariants({ variant: "outline", size: "icon" }), "h-7 w-7 rounded-full p-0"),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 text-[0.8rem] text-muted-foreground font-normal",
        row: "mt-1 flex w-full",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-9 w-9 rounded-full p-0 font-normal"),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today: "border border-input",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-40",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...iconProps} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", iconClassName)} {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}
