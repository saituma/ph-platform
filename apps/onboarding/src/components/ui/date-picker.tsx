import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "@phosphor-icons/react";

import { cn } from "#/lib/utils";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";

export function DatePicker({
	date,
	setDate,
	placeholder = "Pick a date",
	fromYear = 1900,
	toYear = new Date().getFullYear(),
}: {
	date: Date | undefined;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	fromYear?: number;
	toYear?: number;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					className={cn(
						"h-14 w-full justify-start text-left font-normal rounded-2xl bg-background/50 border-border/60 px-6",
						!date && "text-muted-foreground",
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4 text-primary" />
					{date ? format(date, "PPP") : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-xl" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={setDate}
					initialFocus
					startMonth={new Date(fromYear, 0)}
					endMonth={new Date(toYear, 11)}
				/>
			</PopoverContent>
		</Popover>
	);
}
