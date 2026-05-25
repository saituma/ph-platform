import { useMemo } from "react";
import { cn } from "#/lib/utils";

const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number) {
	return new Date(year, month + 1, 0).getDate();
}

interface BirthDateParts {
	day: number | null;
	month: number | null; // 0-indexed
	year: number | null;
}

interface BirthDatePickerProps {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	minYear?: number;
	maxYear?: number;
	className?: string;
}

const selectClass =
	"flex-1 h-14 rounded-2xl border border-border/60 bg-background/50 px-4 text-sm font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all cursor-pointer disabled:opacity-40";

export function BirthDatePicker({
	value,
	onChange,
	minYear = 1940,
	maxYear = new Date().getFullYear(),
	className,
}: BirthDatePickerProps) {
	const parts: BirthDateParts = {
		day: value ? value.getDate() : null,
		month: value ? value.getMonth() : null,
		year: value ? value.getFullYear() : null,
	};

	const years = useMemo(() => {
		const arr: number[] = [];
		for (let y = maxYear; y >= minYear; y--) arr.push(y);
		return arr;
	}, [minYear, maxYear]);

	const days = useMemo(() => {
		const count =
			parts.month !== null && parts.year !== null
				? daysInMonth(parts.month, parts.year)
				: 31;
		const arr: number[] = [];
		for (let d = 1; d <= count; d++) arr.push(d);
		return arr;
	}, [parts.month, parts.year]);

	function commit(next: BirthDateParts) {
		if (next.day !== null && next.month !== null && next.year !== null) {
			const maxDay = daysInMonth(next.month, next.year);
			const safeDay = Math.min(next.day, maxDay);
			onChange(new Date(next.year, next.month, safeDay));
		} else {
			onChange(undefined);
		}
	}

	function handleMonth(e: React.ChangeEvent<HTMLSelectElement>) {
		const month = e.target.value === "" ? null : Number(e.target.value);
		commit({ ...parts, month });
	}

	function handleDay(e: React.ChangeEvent<HTMLSelectElement>) {
		const day = e.target.value === "" ? null : Number(e.target.value);
		commit({ ...parts, day });
	}

	function handleYear(e: React.ChangeEvent<HTMLSelectElement>) {
		const year = e.target.value === "" ? null : Number(e.target.value);
		commit({ ...parts, year });
	}

	return (
		<div className={cn("flex gap-2", className)}>
			{/* Month */}
			<div className="relative flex-[5]">
				<select
					className={selectClass}
					value={parts.month ?? ""}
					onChange={handleMonth}
					aria-label="Birth month"
				>
					<option value="" disabled>Month</option>
					{MONTHS.map((name, i) => (
						<option key={name} value={i}>{name}</option>
					))}
				</select>
				<Chevron />
			</div>

			{/* Day */}
			<div className="relative flex-[3]">
				<select
					className={selectClass}
					value={parts.day ?? ""}
					onChange={handleDay}
					aria-label="Birth day"
				>
					<option value="" disabled>Day</option>
					{days.map((d) => (
						<option key={d} value={d}>{d}</option>
					))}
				</select>
				<Chevron />
			</div>

			{/* Year */}
			<div className="relative flex-[4]">
				<select
					className={selectClass}
					value={parts.year ?? ""}
					onChange={handleYear}
					aria-label="Birth year"
				>
					<option value="" disabled>Year</option>
					{years.map((y) => (
						<option key={y} value={y}>{y}</option>
					))}
				</select>
				<Chevron />
			</div>
		</div>
	);
}

function Chevron() {
	return (
		<div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-40">
			<svg width="10" height="6" viewBox="0 0 10 6" fill="none">
				<title>open</title>
				<path d="M1 1.5L5 4.5L9 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</div>
	);
}
