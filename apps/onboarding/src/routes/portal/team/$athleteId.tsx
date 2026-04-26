import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	Calendar,
	Dumbbell,
	KeyRound,
	Loader2,
	Mail,
	Shield,
	User,
	Utensils,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PasswordStrengthPanel } from "@/components/portal/PasswordStrengthPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isStrongPassword } from "@/lib/password-strength";
import { isPortalTeamRosterManagerRole } from "@/lib/portal-roles";
import { usePortal } from "@/portal/PortalContext";
import {
	fetchAthleteNutritionLogs,
	fetchTeamAthleteDetail,
	type NutritionLogSummary,
	resetTeamAthletePassword,
	rosterQueryKeys,
	type UpdateTeamAthleteBody,
	updateTeamAthlete,
	uploadTeamAthletePhoto,
} from "@/services/teamRosterService";

export const Route = createFileRoute("/portal/team/$athleteId")({
	component: TeamAthleteDetailPage,
});

function formatAthleteNutritionSummary(log: NutritionLogSummary): string {
	const parts: string[] = [];
	const slots: [string, string | null | undefined][] = [
		["Breakfast", log.breakfast],
		["Lunch", log.lunch],
		["Dinner", log.dinner],
		["AM snack", log.snacksMorning],
		["PM snack", log.snacksAfternoon],
		["Eve snack", log.snacksEvening],
	];
	for (const [label, raw] of slots) {
		const s = raw == null ? "" : String(raw).trim();
		if (!s) continue;
		if (s.toLowerCase() === "yes") parts.push(label);
		else parts.push(`${label}: ${s}`);
	}
	const w = log.waterIntake ?? 0;
	if (w > 0) parts.push(`Water ×${w}`);
	const steps = log.steps ?? 0;
	if (steps > 0) parts.push(`Steps ${steps}`);
	if (log.foodDiary?.trim()) parts.push("Food diary");
	return parts.length ? parts.join(" · ") : "No meal slots logged yet";
}

type ProvisionalState = {
	provisionalEmail?: string;
	provisionalPassword?: string;
};

function TeamAthleteDetailPage() {
	const { athleteId } = Route.useParams();
	const navigate = useNavigate();
	const provisional = useRouterState({
		select: (s) => s.location.state as ProvisionalState | undefined,
	});
	const { token, user } = usePortal();
	const queryClient = useQueryClient();
	const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
	const [loginCustomPwd, setLoginCustomPwd] = useState("");
	const [loginCustomPwdConfirm, setLoginCustomPwdConfirm] = useState("");
	const photoInputRef = useRef<HTMLInputElement>(null);
	const [profileForm, setProfileForm] = useState({
		name: "",
		athleteType: "youth" as "youth" | "adult",
		age: "",
		birthDate: "",
		trainingPerWeek: "",
		performanceGoals: "",
		equipmentAccess: "",
		growthNotes: "",
	});

	const id = Number(athleteId);
	const canManageTeam = isPortalTeamRosterManagerRole(user?.role);

	const detailQ = useQuery({
		queryKey: rosterQueryKeys.athlete(token, id),
		queryFn: () => {
			if (!token) throw new Error("Not authenticated");
			return fetchTeamAthleteDetail(token, id);
		},
		enabled: !!token && Number.isFinite(id) && canManageTeam,
	});

	const nutritionQ = useQuery({
		queryKey: rosterQueryKeys.nutrition(token, detailQ.data?.userId ?? 0),
		queryFn: () => {
			if (!token || !detailQ.data?.userId) throw new Error("Missing context");
			return fetchAthleteNutritionLogs(token, detailQ.data.userId, 21);
		},
		enabled: !!token && !!detailQ.data?.userId && canManageTeam,
	});

	useEffect(() => {
		const d = detailQ.data;
		if (!d) return;
		setProfileForm({
			name: d.name,
			athleteType: d.athleteType === "adult" ? "adult" : "youth",
			age: String(d.age),
			birthDate: d.birthDate ? d.birthDate.slice(0, 10) : "",
			trainingPerWeek: String(d.trainingPerWeek),
			performanceGoals: d.performanceGoals ?? "",
			equipmentAccess: d.equipmentAccess ?? "",
			growthNotes: d.growthNotes ?? "",
		});
	}, [detailQ.data?.athleteId, detailQ.data?.userUpdatedAt]);

	const resetM = useMutation({
		mutationFn: async (customPassword?: string) => {
			if (!token) throw new Error("Missing token");
			return resetTeamAthletePassword(token, id, customPassword);
		},
		onSuccess: (data, customPassword) => {
			setRevealedPassword(data.temporaryPassword);
			if (customPassword) {
				setLoginCustomPwd("");
				setLoginCustomPwdConfirm("");
				toast.success("Custom password saved — share it securely.");
			} else {
				toast.success("New temporary password generated — share it securely.");
			}
			void queryClient.invalidateQueries({ queryKey: rosterQueryKeys.all });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const canSetCustomPassword = useMemo(() => {
		if (resetM.isPending) return false;
		const pw = loginCustomPwd.trim();
		const pw2 = loginCustomPwdConfirm.trim();
		if (!pw || !pw2) return false;
		if (pw !== pw2) return false;
		return isStrongPassword(pw);
	}, [loginCustomPwd, loginCustomPwdConfirm, resetM.isPending]);

	const saveProfileM = useMutation({
		mutationFn: async () => {
			if (!token) throw new Error("Missing token");
			const age = Math.floor(Number(profileForm.age));
			const trainingPerWeek = Math.floor(Number(profileForm.trainingPerWeek));
			if (!Number.isFinite(age) || age < 5 || age > 99) {
				throw new Error("Age must be between 5 and 99.");
			}
			if (
				!Number.isFinite(trainingPerWeek) ||
				trainingPerWeek < 1 ||
				trainingPerWeek > 14
			) {
				throw new Error("Training sessions per week must be between 1 and 14.");
			}
			const body: UpdateTeamAthleteBody = {
				name: profileForm.name.trim(),
				athleteType: profileForm.athleteType,
				age,
				trainingPerWeek,
				birthDate: profileForm.birthDate.trim() || null,
				performanceGoals: profileForm.performanceGoals.trim() || null,
				equipmentAccess: profileForm.equipmentAccess.trim() || null,
				growthNotes: profileForm.growthNotes.trim() || null,
			};
			if (!body.name) throw new Error("Display name is required.");
			return updateTeamAthlete(token, id, body);
		},
		onSuccess: () => {
			toast.success("Profile updated.");
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.athlete(token, id),
			});
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.list(token),
			});
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const photoM = useMutation({
		mutationFn: async (file: File) => {
			if (!token) throw new Error("Missing token");
			const publicUrl = await uploadTeamAthletePhoto(token, file);
			await updateTeamAthlete(token, id, { profilePicture: publicUrl });
		},
		onSuccess: () => {
			toast.success("Photo updated.");
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.athlete(token, id),
			});
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.list(token),
			});
		},
		onError: (e: Error) => toast.error(e.message),
	});

	if (!canManageTeam) {
		return (
			<div className="container mx-auto max-w-2xl p-4 pb-24">
				<p className="text-muted-foreground">
					This page is for team coaches and admins.
				</p>
				<Link
					to="/portal/dashboard"
					className="mt-4 inline-block font-bold text-primary"
				>
					Dashboard
				</Link>
			</div>
		);
	}

	if (!Number.isFinite(id)) {
		return (
			<div className="container mx-auto p-4">
				<p className="text-destructive">Invalid athlete id.</p>
			</div>
		);
	}

	if (detailQ.isLoading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center p-4">
				<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (detailQ.error || !detailQ.data) {
		return (
			<div className="container mx-auto max-w-2xl space-y-4 p-4">
				<Link
					to="/portal/team"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to team
				</Link>
				<p className="text-destructive">
					{detailQ.error instanceof Error
						? detailQ.error.message
						: "Could not load athlete."}
				</p>
			</div>
		);
	}

	const a = detailQ.data;
	const formatDate = (s: string | null) => {
		if (!s) return "—";
		try {
			return new Date(s).toLocaleDateString(undefined, {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch {
			return s;
		}
	};

	return (
		<div className="container mx-auto max-w-2xl space-y-6 p-4 pb-24">
			<Link
				to="/portal/team"
				className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" aria-hidden />
				Back to team roster
			</Link>

			{provisional?.provisionalPassword ? (
				<div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-2">
					<p className="text-sm font-bold text-primary">New login (copy now)</p>
					<p className="text-sm font-mono break-all">
						<strong>Email:</strong> {provisional.provisionalEmail ?? "—"}
					</p>
					<p className="text-sm font-mono break-all">
						<strong>Password:</strong> {provisional.provisionalPassword}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="text-xs"
						onClick={() => {
							void navigate({
								to: "/portal/team/$athleteId",
								params: { athleteId },
								replace: true,
								state: {} as ProvisionalState,
							} as any);
						}}
					>
						Dismiss (clears from browser history state)
					</Button>
				</div>
			) : null}

			<input
				ref={photoInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (file) photoM.mutate(file);
				}}
			/>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
				<div className="flex flex-col items-start gap-2">
					<button
						type="button"
						className="flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-muted"
						onClick={() => photoInputRef.current?.click()}
						disabled={photoM.isPending}
						aria-label="Change profile photo"
					>
						{a.profilePicture ? (
							<img
								src={a.profilePicture}
								alt=""
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center text-muted-foreground">
								<User className="h-12 w-12" />
							</div>
						)}
					</button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="text-xs"
						disabled={photoM.isPending}
						onClick={() => photoInputRef.current?.click()}
					>
						{photoM.isPending ? (
							<>
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								Uploading…
							</>
						) : (
							"Change photo"
						)}
					</Button>
				</div>
				<div>
					<h1 className="text-3xl font-black uppercase italic tracking-tight">
						{a.name}
					</h1>
					<p className="text-muted-foreground">{a.teamName}</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Athlete ID #{a.athleteId} · User ID #{a.userId}
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Mail className="h-5 w-5" />
						Mobile app login
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Passwords are stored securely and cannot be shown again after you
						leave this page. Set a custom password or generate a random one —
						either logs the athlete out everywhere until they sign in with the
						new password.
					</p>
					<div className="rounded-xl border bg-muted/40 px-4 py-3 font-mono text-sm break-all">
						{a.email}
					</div>
					<div className="space-y-2 rounded-xl border bg-muted/20 p-4">
						<p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
							Custom password
						</p>
						<div className="grid gap-2 sm:grid-cols-2">
							<div className="space-y-1.5 sm:col-span-2">
								<Label htmlFor="login-custom-pw" className="text-xs">
									New password
								</Label>
								<Input
									id="login-custom-pw"
									type="password"
									autoComplete="new-password"
									value={loginCustomPwd}
									onChange={(e) => setLoginCustomPwd(e.target.value)}
									placeholder="e.g. Phoenix#2026Team"
									disabled={resetM.isPending}
								/>
								<PasswordStrengthPanel password={loginCustomPwd} />
							</div>
							<div className="space-y-1.5 sm:col-span-2">
								<Label htmlFor="login-custom-pw-confirm" className="text-xs">
									Confirm
								</Label>
								<Input
									id="login-custom-pw-confirm"
									type="password"
									autoComplete="new-password"
									value={loginCustomPwdConfirm}
									onChange={(e) => setLoginCustomPwdConfirm(e.target.value)}
									placeholder="Repeat password"
									disabled={resetM.isPending}
								/>
							</div>
						</div>
						<Button
							type="button"
							variant="default"
							className="gap-2"
							disabled={!canSetCustomPassword}
							onClick={() => {
								const a = loginCustomPwd.trim();
								const b = loginCustomPwdConfirm.trim();
								if (!a || !b) {
									toast.error("Enter and confirm the new password.");
									return;
								}
								if (a !== b) {
									toast.error("Passwords do not match.");
									return;
								}
								if (!isStrongPassword(a)) {
									toast.error(
										"Use a strong password: 10+ characters with upper & lowercase, a number, and a symbol.",
									);
									return;
								}
								resetM.mutate(a);
							}}
						>
							{resetM.isPending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Saving…
								</>
							) : (
								<>
									<KeyRound className="h-4 w-4" />
									Set custom password
								</>
							)}
						</Button>
					</div>
					<div className="relative">
						<div className="absolute inset-0 flex items-center" aria-hidden>
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-2 text-muted-foreground">Or</span>
						</div>
					</div>
					<Button
						type="button"
						variant="secondary"
						className="gap-2"
						onClick={() => resetM.mutate(undefined)}
						disabled={resetM.isPending}
					>
						<KeyRound className="h-4 w-4" />
						{resetM.isPending ? "Working…" : "Generate new temporary password"}
					</Button>
					{revealedPassword ? (
						<div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-2">
							<p className="text-sm font-bold text-primary">
								New password (copy now)
							</p>
							<p className="font-mono text-sm break-all">{revealedPassword}</p>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-xs"
								onClick={() => setRevealedPassword(null)}
							>
								Hide
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Profile & training</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="athlete-name" className="flex items-center gap-2">
								<User className="h-4 w-4 text-muted-foreground" />
								Display name
							</Label>
							<Input
								id="athlete-name"
								value={profileForm.name}
								onChange={(e) =>
									setProfileForm((p) => ({ ...p, name: e.target.value }))
								}
								disabled={saveProfileM.isPending}
								autoComplete="off"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="athlete-type" className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-muted-foreground" />
								Athlete type
							</Label>
							<select
								id="athlete-type"
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
								value={profileForm.athleteType}
								onChange={(e) =>
									setProfileForm((p) => ({
										...p,
										athleteType: e.target.value as "youth" | "adult",
									}))
								}
								disabled={saveProfileM.isPending}
							>
								<option value="youth">Youth</option>
								<option value="adult">Adult</option>
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="athlete-age" className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								Age
							</Label>
							<Input
								id="athlete-age"
								type="number"
								min={5}
								max={99}
								value={profileForm.age}
								onChange={(e) =>
									setProfileForm((p) => ({ ...p, age: e.target.value }))
								}
								disabled={saveProfileM.isPending}
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="athlete-birth"
								className="flex items-center gap-2"
							>
								<Calendar className="h-4 w-4 text-muted-foreground" />
								Birth date
							</Label>
							<Input
								id="athlete-birth"
								type="date"
								value={profileForm.birthDate}
								onChange={(e) =>
									setProfileForm((p) => ({ ...p, birthDate: e.target.value }))
								}
								disabled={saveProfileM.isPending}
							/>
						</div>
						<div className="space-y-2">
							<Label
								htmlFor="athlete-training"
								className="flex items-center gap-2"
							>
								<Dumbbell className="h-4 w-4 text-muted-foreground" />
								Training sessions / week
							</Label>
							<Input
								id="athlete-training"
								type="number"
								min={1}
								max={14}
								value={profileForm.trainingPerWeek}
								onChange={(e) =>
									setProfileForm((p) => ({
										...p,
										trainingPerWeek: e.target.value,
									}))
								}
								disabled={saveProfileM.isPending}
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="athlete-goals">Performance goals</Label>
							<Textarea
								id="athlete-goals"
								rows={2}
								value={profileForm.performanceGoals}
								onChange={(e) =>
									setProfileForm((p) => ({
										...p,
										performanceGoals: e.target.value,
									}))
								}
								disabled={saveProfileM.isPending}
								placeholder="Optional"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="athlete-equipment">Equipment access</Label>
							<Textarea
								id="athlete-equipment"
								rows={2}
								value={profileForm.equipmentAccess}
								onChange={(e) =>
									setProfileForm((p) => ({
										...p,
										equipmentAccess: e.target.value,
									}))
								}
								disabled={saveProfileM.isPending}
								placeholder="Optional"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<Label htmlFor="athlete-growth">Growth notes</Label>
							<Textarea
								id="athlete-growth"
								rows={2}
								value={profileForm.growthNotes}
								onChange={(e) =>
									setProfileForm((p) => ({ ...p, growthNotes: e.target.value }))
								}
								disabled={saveProfileM.isPending}
								placeholder="Optional — coach-only context"
							/>
						</div>
					</div>
					<Button
						type="button"
						onClick={() => saveProfileM.mutate()}
						disabled={saveProfileM.isPending}
						className="gap-2"
					>
						{saveProfileM.isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving…
							</>
						) : (
							"Save changes"
						)}
					</Button>
					<DetailRow
						label="Onboarding complete"
						value={a.onboardingCompleted ? "Yes" : "No"}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Utensils className="h-5 w-5" />
						Nutrition logs
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Daily check-ins from the PH mobile app for this athlete. The same
						day can be updated multiple times as they log meals or habits — last
						save wins for fields they change; earlier meals are kept when they
						send empty slots.
					</p>
					{nutritionQ.isLoading ? (
						<div className="flex justify-center py-6">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : nutritionQ.error ? (
						<p className="text-sm text-destructive">
							{nutritionQ.error instanceof Error
								? nutritionQ.error.message
								: "Could not load nutrition logs."}
						</p>
					) : !(nutritionQ.data?.logs ?? []).length ? (
						<p className="text-sm text-muted-foreground">
							No nutrition rows in the selected window yet.
						</p>
					) : (
						<ul className="divide-y overflow-hidden rounded-xl border">
							{(nutritionQ.data?.logs ?? []).map((log) => (
								<li key={log.id} className="space-y-1 px-3 py-3 text-sm">
									<div className="flex flex-wrap items-baseline justify-between gap-2 font-medium">
										<span>{log.dateKey}</span>
										{log.updatedAt ? (
											<span className="text-xs font-normal text-muted-foreground">
												Updated{" "}
												{new Date(log.updatedAt).toLocaleString(undefined, {
													dateStyle: "short",
													timeStyle: "short",
												})}
											</span>
										) : null}
									</div>
									<p className="text-xs text-muted-foreground">
										{formatAthleteNutritionSummary(log)}
									</p>
									{log.coachFeedback?.trim() ? (
										<p className="text-xs font-medium text-primary">
											Coach feedback on file
										</p>
									) : null}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Account</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-2 text-sm">
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Account name</span>
						<span className="font-medium text-right">{a.accountName}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">Email verified</span>
						<span className="font-medium">
							{a.emailVerified ? "Yes" : "No"}
						</span>
					</div>
					<div className="flex justify-between gap-4">
						<span className="text-muted-foreground">User since</span>
						<span className="font-medium">{formatDate(a.userCreatedAt)}</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function DetailRow({
	icon: Icon,
	label,
	value,
}: {
	icon?: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
}) {
	return (
		<div className="flex gap-2 rounded-lg border bg-card/50 px-3 py-2">
			{Icon ? (
				<Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			) : null}
			<div>
				<p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
					{label}
				</p>
				<p className="text-sm font-medium">{value}</p>
			</div>
		</div>
	);
}
