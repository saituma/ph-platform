import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, useDayPicker } from "react-day-picker";
import { format, setYear } from "date-fns";

import { cn } from "#/lib/utils";
import { buttonVariants, Button } from "#/components/ui/button";

function CustomCaption({ displayMonth }: { displayMonth: Date }) {
	const { goToMonth, nextMonth, previousMonth } = useNavigation();
	const { startMonth, endMonth } = useDayPicker();

	// Determine year range
	const startYear = startMonth ? startMonth.getFullYear() : 1900;
	const endYear = endMonth ? endMonth.getFullYear() : new Date().getFullYear();

	const years = [];
	for (let year = startYear; year <= endYear; year++) {
		years.push(year);
	}

	const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newYear = Number.parseInt(e.target.value, 10);
		if (!Number.isNaN(newYear)) {
			goToMonth(setYear(displayMonth, newYear));
		}
	};

	return (
		<div className="flex flex-col space-y-3 pt-1 pb-4 relative">
			{/* Year Selector */}
			<div className="flex justify-center">
				<div className="relative inline-block">
					<select
						className="text-sm font-semibold bg-background/50 border border-border/60 rounded-xl px-4 py-1.5 hover:bg-accent focus:ring-2 focus:ring-primary/20 appearance-none text-center min-w-[100px] cursor-pointer transition-all shadow-sm"
						value={displayMonth.getFullYear()}
						onChange={handleYearChange}
					>
						{years.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
					<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
						<svg
							width="10"
							height="6"
							viewBox="0 0 10 6"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M1 1L5 5L9 1"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
				</div>
			</div>

			{/* Month Switcher */}
			<div className="flex items-center justify-between px-2">
				<Button
					variant="outline"
					className="h-9 w-9 bg-background/50 border-border/60 rounded-xl p-0 opacity-70 hover:opacity-100 disabled:opacity-30 transition-all shadow-sm"
					onClick={() => previousMonth && goToMonth(previousMonth)}
					disabled={!previousMonth}
					type="button"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				<div className="text-sm font-bold tracking-tight text-foreground uppercase tracking-widest">
					{format(displayMonth, "MMMM")}
				</div>

				<Button
					variant="outline"
					className="h-9 w-9 bg-background/50 border-border/60 rounded-xl p-0 opacity-70 hover:opacity-100 disabled:opacity-30 transition-all shadow-sm"
					onClick={() => nextMonth && goToMonth(nextMonth)}
					disabled={!nextMonth}
					type="button"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-4 bg-card/50 backdrop-blur-sm rounded-3xl border border-border/40 shadow-sm", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				month: "space-y-4",
				month_grid: "w-full border-collapse space-y-1",
				weekdays: "flex justify-between mb-2",
				weekday: "text-muted-foreground/60 rounded-md w-9 font-bold text-[0.7rem] text-center uppercase tracking-tighter",
				week: "flex w-full mt-2 justify-between",
				day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
				day_button: cn(
					buttonVariants({ variant: "ghost" }),
					"h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary transition-all rounded-xl",
				),
				selected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl shadow-lg shadow-primary/20",
				today: "bg-accent/50 text-accent-foreground rounded-xl border border-primary/20",
				outside:
					"day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground opacity-20",
				disabled: "text-muted-foreground opacity-30",
				range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
				hidden: "invisible",
				...classNames,
			}}
			components={{
				Caption: CustomCaption,
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
