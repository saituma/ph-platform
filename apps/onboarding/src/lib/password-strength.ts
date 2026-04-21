/** Keep rules aligned with `apps/api/src/lib/strong-team-password.ts`. */

export const STRONG_PASSWORD_MIN = 10;
export const STRONG_PASSWORD_MAX = 128;

export type PasswordStrengthCheck = {
	id: string;
	label: string;
	met: boolean;
};

export function getPasswordStrengthChecks(password: string): PasswordStrengthCheck[] {
	return [
		{
			id: "len",
			label: `${STRONG_PASSWORD_MIN}–${STRONG_PASSWORD_MAX} characters`,
			met:
				password.length >= STRONG_PASSWORD_MIN &&
				password.length <= STRONG_PASSWORD_MAX,
		},
		{ id: "lower", label: "Lowercase letter", met: /[a-z]/.test(password) },
		{ id: "upper", label: "Uppercase letter", met: /[A-Z]/.test(password) },
		{ id: "num", label: "Number", met: /[0-9]/.test(password) },
		{
			id: "sym",
			label: "Symbol (e.g. !@#$%)",
			met: /[^A-Za-z0-9]/.test(password),
		},
	];
}

export function isStrongPassword(password: string): boolean {
	return getPasswordStrengthChecks(password).every((c) => c.met);
}

export function getPasswordStrengthMeter(password: string): {
	filled: number;
	total: number;
	label: string;
	tone: "muted" | "destructive" | "amber" | "success";
} {
	const checks = getPasswordStrengthChecks(password);
	const total = checks.length;
	const filled = checks.filter((c) => c.met).length;
	if (password.length === 0) {
		return { filled: 0, total, label: "", tone: "muted" };
	}
	if (filled <= 2) {
		return { filled, total, label: "Weak", tone: "destructive" };
	}
	if (filled < total) {
		return { filled, total, label: "Good", tone: "amber" };
	}
	return { filled, total, label: "Strong", tone: "success" };
}
