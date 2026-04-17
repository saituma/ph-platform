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
}: {
	date: Date | undefined;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
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
					disabled={(date) =>
						date > new Date() || date < new Date("1900-01-01")
					}
				/>
			</PopoverContent>
		</Popover>
	);
}
