import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	getPasswordStrengthChecks,
	getPasswordStrengthMeter,
} from "@/lib/password-strength";

type PasswordStrengthPanelProps = {
	password: string;
	className?: string;
};

export function PasswordStrengthPanel({
	password,
	className,
}: PasswordStrengthPanelProps) {
	const checks = getPasswordStrengthChecks(password);
	const meter = getPasswordStrengthMeter(password);
	const showMeter = password.length > 0;

	return (
		<div className={cn("space-y-2", className)} aria-live="polite">
			{showMeter ? (
				<div className="space-y-1">
					<div className="flex gap-1" role="meter" aria-valuenow={meter.filled} aria-valuemax={meter.total}>
						{Array.from({ length: meter.total }, (_, i) => (
							<div
								key={i}
								className={cn(
									"h-1.5 flex-1 rounded-full transition-colors",
									i < meter.filled
										? meter.tone === "destructive"
											? "bg-destructive/80"
											: meter.tone === "amber"
												? "bg-amber-500"
												: "bg-emerald-600"
										: "bg-muted",
								)}
							/>
						))}
					</div>
					<p
						className={cn(
							"text-xs font-medium",
							meter.tone === "destructive" && "text-destructive",
							meter.tone === "amber" && "text-amber-700 dark:text-amber-400",
							meter.tone === "success" && "text-emerald-700 dark:text-emerald-400",
							meter.tone === "muted" && "text-muted-foreground",
						)}
					>
						{meter.label}
					</p>
				</div>
			) : null}
			<ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
				{checks.map((c) => (
					<li
						key={c.id}
						className={cn(
							"flex items-center gap-1.5",
							c.met && "font-medium text-foreground",
						)}
					>
						{c.met ? (
							<Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
						) : (
							<Minus className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
						)}
						<span>{c.label}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
