import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, useDayPicker } from "react-day-picker";
import { format, setYear } from "date-fns";

import { cn } from "#/lib/utils";
import { buttonVariants, Button } from "#/components/ui/button";

function CustomMonthCaption(props: any) {
	const { goToMonth, nextMonth, previousMonth } = useNavigation();
	const { startMonth, endMonth } = useDayPicker() as {
		startMonth?: Date;
		endMonth?: Date;
	};

	// In v9, MonthCaption receives a 'calendarMonth' prop
	const calendarMonth = props.calendarMonth;
	if (!calendarMonth || !calendarMonth.date) return <div />;
	
	const displayDate = calendarMonth.date;

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
			goToMonth(setYear(displayDate, newYear));
		}
	};

	return (
		<div className="flex flex-col space-y-4 pt-1 pb-6 relative w-full">
			{/* Year Selector - TOP */}
			<div className="flex justify-center">
				<div className="relative inline-block group">
					<select
						className="text-sm font-bold bg-background/40 border border-border/40 rounded-2xl px-5 py-2 hover:bg-accent/50 focus:ring-4 focus:ring-primary/10 appearance-none text-center min-w-[120px] cursor-pointer transition-all shadow-sm backdrop-blur-md"
						value={displayDate.getFullYear()}
						onChange={handleYearChange}
					>
						{years.map((year) => (
							<option key={year} value={year} className="bg-background text-foreground">
								{year}
							</option>
						))}
					</select>
					<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity">
						<svg
							width="10"
							height="6"
							viewBox="0 0 10 6"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Year selector chevron</title>
							<path
								d="M1 1.5L5 4.5L9 1.5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
				</div>
			</div>

			{/* Month Switcher - MIDDLE with icons at the ends */}
			<div className="flex items-center justify-between w-full px-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-2xl p-0 hover:bg-primary/10 transition-all active:scale-90"
					onClick={(e) => {
						e.preventDefault();
						if (previousMonth) goToMonth(previousMonth);
					}}
					disabled={!previousMonth}
					type="button"
				>
					<ChevronLeft className="h-5 w-5 text-primary" strokeWidth={2.5} />
				</Button>

				<div className="text-base font-black tracking-widest text-foreground uppercase">
					{format(displayDate, "MMMM")}
				</div>

				<Button
					variant="ghost"
					size="icon"
					className="h-10 w-10 rounded-2xl p-0 hover:bg-primary/10 transition-all active:scale-90"
					onClick={(e) => {
						e.preventDefault();
						if (nextMonth) goToMonth(nextMonth);
					}}
					disabled={!nextMonth}
					type="button"
				>
					<ChevronRight className="h-5 w-5 text-primary" strokeWidth={2.5} />
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
			className={cn("p-6 bg-card/60 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				month: "space-y-4 w-full",
				month_grid: "w-full border-collapse space-y-1",
				weekdays: "flex justify-between mb-4 px-1",
				weekday: "text-muted-foreground/50 rounded-md w-9 font-black text-[0.65rem] text-center uppercase tracking-widest",
				week: "flex w-full mt-2 justify-between gap-1",
				day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
				day_button: cn(
					buttonVariants({ variant: "ghost" }),
					"h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-primary/20 hover:text-primary transition-all rounded-2xl",
				),
				selected:
					"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-2xl shadow-[0_8px_20px_-4px_rgba(var(--primary),0.4)] scale-110 z-10",
				today: "bg-primary/10 text-primary rounded-2xl border-2 border-primary/30 ring-4 ring-primary/5",
				outside:
					"day-outside text-muted-foreground opacity-20 aria-selected:bg-accent/50 aria-selected:text-muted-foreground opacity-10",
				disabled: "text-muted-foreground opacity-20",
				range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
				hidden: "invisible",
				...classNames,
			}}
			components={{
				MonthCaption: CustomMonthCaption,
				// We need to hide the default Nav as our CustomMonthCaption handles it
				Nav: () => <div />,
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
