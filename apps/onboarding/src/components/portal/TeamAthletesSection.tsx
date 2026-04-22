import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronRight, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PasswordStrengthPanel } from "@/components/portal/PasswordStrengthPanel";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { env } from "@/env";
import { isStrongPassword } from "@/lib/password-strength";
import {
	isPortalTeamFacingCoachRole,
	isPortalTeamRosterManagerRole,
} from "@/lib/portal-roles";
import { usePortal } from "@/portal/PortalContext";
import {
	createTeamAthlete,
	fetchTeamRoster,
	rosterQueryKeys,
	updateTeamEmailSlug,
	uploadTeamAthletePhoto,
} from "@/services/teamRosterService";

function emailDomain() {
	return env.VITE_TEAM_ATHLETE_EMAIL_DOMAIN || "phplatform.com";
}

type TeamAthletesSectionProps = {
	/** When false, hide the in-card title (e.g. page already has an H1). */
	showSectionTitle?: boolean;
};

export function TeamAthletesSection({
	showSectionTitle = true,
}: TeamAthletesSectionProps) {
	const { token, user, refresh } = usePortal();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [sheetOpen, setSheetOpen] = useState(false);
	const [username, setUsername] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [age, setAge] = useState("");
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [customPassword, setCustomPassword] = useState("");
	const [customPasswordConfirm, setCustomPasswordConfirm] = useState("");
	const [creating, setCreating] = useState(false);
	const [slugDraft, setSlugDraft] = useState("");

	const adminBase = env.VITE_PUBLIC_ADMIN_WEB_URL?.replace(/\/$/, "") ?? "";

	const canManageTeam = isPortalTeamRosterManagerRole(user?.role);
	const isAdmin = user?.role === "admin" || user?.role === "superAdmin";

	const rosterQ = useQuery({
		queryKey: rosterQueryKeys.list(token),
		queryFn: async () => {
			const t = token;
			if (!t) throw new Error("Not authenticated");
			return fetchTeamRoster(t);
		},
		enabled: !!token && canManageTeam && !!user?.team?.id,
	});

	const roster = rosterQ.data;
	const team = roster?.team;
	const loading = rosterQ.isLoading;

	useEffect(() => {
		if (team?.emailSlug) setSlugDraft(team.emailSlug);
	}, [team?.emailSlug]);

	useEffect(() => {
		if (!photoFile) {
			setPhotoPreview(null);
			return;
		}
		const url = URL.createObjectURL(photoFile);
		setPhotoPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [photoFile]);

	const resetAddForm = () => {
		setUsername("");
		setDisplayName("");
		setAge("");
		setCustomPassword("");
		setCustomPasswordConfirm("");
		setPhotoFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const onSaveSlug = async () => {
		if (!token || !team) return;
		const raw = (slugDraft || team.emailSlug).trim();
		if (raw.length < 2) {
			toast.error("Segment is too short.");
			return;
		}
		try {
			await updateTeamEmailSlug(token, raw);
			toast.success("Team email segment updated");
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.list(token),
			});
			void refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Update failed");
		}
	};

	if (isAdmin && !isPortalTeamFacingCoachRole(user?.role)) {
		return (
			<div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
				<h2 className="text-lg font-semibold">Team &amp; athletes (admin)</h2>
				<p className="text-sm text-muted-foreground">
					Open the admin console to view teams, rosters, and member details.
				</p>
				{adminBase ? (
					<a
						href={`${adminBase}/teams`}
						className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
					>
						Open admin — teams
					</a>
				) : (
					<p className="text-xs text-muted-foreground">
						Set{" "}
						<code className="rounded bg-muted px-1">
							VITE_PUBLIC_ADMIN_WEB_URL
						</code>{" "}
						in <code className="rounded bg-muted px-1">.env.local</code> for a
						direct link.
					</p>
				)}
			</div>
		);
	}

	if (!canManageTeam || !user?.team?.id) return null;

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!token) return;
		const a = Number(age);
		if (!username.trim() || !displayName.trim() || !Number.isFinite(a)) {
			toast.error("Username, name, and age are required.");
			return;
		}
		const cp = customPassword.trim();
		const cp2 = customPasswordConfirm.trim();
		let initialPassword: string | undefined;
		if (cp || cp2) {
			if (cp !== cp2) {
				toast.error("Passwords do not match.");
				return;
			}
			if (!isStrongPassword(cp)) {
				toast.error(
					"Initial password must be strong: 10+ characters with upper & lowercase, a number, and a symbol.",
				);
				return;
			}
			initialPassword = cp;
		}
		setCreating(true);
		try {
			let profilePicture: string | null = null;
			if (photoFile) {
				profilePicture = await uploadTeamAthletePhoto(token, photoFile);
			}
			const res = await createTeamAthlete(token, {
				username: username.trim(),
				name: displayName.trim(),
				age: a,
				profilePicture,
				...(initialPassword ? { customPassword: initialPassword } : {}),
			});
			resetAddForm();
			setSheetOpen(false);
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.list(token),
			});
			void queryClient.invalidateQueries({
				queryKey: rosterQueryKeys.athlete(token, res.athleteId),
			});
			void refresh();
			toast.success("Athlete created");
			navigate({
				to: "/portal/team/$athleteId",
				params: { athleteId: String(res.athleteId) },
				state: {
					provisionalEmail: res.email,
					provisionalPassword: res.temporaryPassword,
				} as { provisionalEmail?: string; provisionalPassword?: string },
			});
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not create athlete",
			);
		} finally {
			setCreating(false);
		}
	};

	return (
		<div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					{showSectionTitle ? (
						<>
							<h2 className="text-xl font-semibold">Team athletes</h2>
							<p className="text-sm text-muted-foreground mt-1">
								Each player gets login{" "}
								<span className="font-mono text-xs">
									username.teamsegment@{emailDomain()}
								</span>
								. Open a player’s card to see full details and manage their
								login.
							</p>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							Each player gets login{" "}
							<span className="font-mono text-xs">
								username.teamsegment@{emailDomain()}
							</span>
							. Tap a player to see their profile and mobile login options.
						</p>
					)}
				</div>
				{adminBase ? (
					<a
						href={`${adminBase}/teams/${encodeURIComponent(user.team?.name ?? "")}`}
						className="text-sm font-bold text-primary hover:underline shrink-0"
					>
						Admin team page →
					</a>
				) : null}
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Loading roster…</p>
			) : team ? (
				<>
					<div className="flex flex-wrap gap-4 text-sm">
						<span>
							<strong>{team.memberCount}</strong> / {team.maxAthletes} athletes
						</span>
						<span className="text-muted-foreground">
							{team.slotsRemaining} slot{team.slotsRemaining === 1 ? "" : "s"}{" "}
							left
						</span>
					</div>

					<div className="rounded-xl border bg-muted/30 p-4 space-y-2">
						<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Team email segment
						</p>
						<p className="text-xs text-muted-foreground">
							Default is derived from your team name. Used in every athlete
							email before @{emailDomain()}.
						</p>
						<div className="flex flex-col gap-2 sm:flex-row">
							<input
								className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm font-mono"
								value={slugDraft}
								onChange={(e) => setSlugDraft(e.target.value)}
								placeholder={team.emailSlug}
							/>
							<button
								type="button"
								onClick={() => void onSaveSlug()}
								className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
							>
								Save segment
							</button>
						</div>
					</div>

					{team.slotsRemaining > 0 ? (
						<Button
							type="button"
							className="gap-2 rounded-xl"
							onClick={() => setSheetOpen(true)}
						>
							<UserPlus className="h-4 w-4" />
							Add athlete
						</Button>
					) : (
						<p className="text-sm text-amber-700 dark:text-amber-400">
							Roster is full for your current plan. Upgrade seats or contact
							support to add more athletes.
						</p>
					)}

					<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
						<SheetContent
							side="bottom"
							className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t-2"
						>
							<SheetHeader>
								<SheetTitle>Add team member</SheetTitle>
								<SheetDescription>
									Creates a mobile-app login. Optionally set a strong initial
									password (live strength meter) or we generate one. Choose a
									photo from your device (optional); we upload it securely.
								</SheetDescription>
							</SheetHeader>
							<form
								onSubmit={onCreate}
								className="grid max-w-lg gap-4 px-1 py-2"
							>
								<div className="flex items-center gap-4">
									<div className="relative h-20 w-20 overflow-hidden rounded-2xl border bg-muted">
										{photoPreview ? (
											<img
												src={photoPreview}
												alt=""
												className="h-full w-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center text-muted-foreground">
												<Camera className="h-8 w-8" />
											</div>
										)}
									</div>
									<div className="flex flex-col gap-2">
										<input
											ref={fileInputRef}
											type="file"
											accept="image/jpeg,image/png,image/webp,image/gif"
											className="hidden"
											onChange={(e) =>
												setPhotoFile(e.target.files?.[0] ?? null)
											}
										/>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											className="w-fit"
											onClick={() => fileInputRef.current?.click()}
										>
											Choose photo
										</Button>
										{photoFile ? (
											<button
												type="button"
												className="text-left text-xs text-muted-foreground underline"
												onClick={() => {
													setPhotoFile(null);
													if (fileInputRef.current)
														fileInputRef.current.value = "";
												}}
											>
												Remove photo
											</button>
										) : null}
									</div>
								</div>

								<label className="grid gap-1 text-sm">
									<span className="text-muted-foreground">
										Username (for email)
									</span>
									<input
										className="rounded-lg border bg-background px-3 py-2"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										placeholder="e.g. alex or alex.m"
										required
										autoComplete="off"
									/>
								</label>
								<label className="grid gap-1 text-sm">
									<span className="text-muted-foreground">Display name</span>
									<input
										className="rounded-lg border bg-background px-3 py-2"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										required
										autoComplete="off"
									/>
								</label>
								<label className="grid gap-1 text-sm">
									<span className="text-muted-foreground">Age</span>
									<input
										type="number"
										min={5}
										max={99}
										className="rounded-lg border bg-background px-3 py-2"
										value={age}
										onChange={(e) => setAge(e.target.value)}
										required
									/>
								</label>
								<div className="grid gap-2 rounded-xl border bg-muted/30 p-3">
									<p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
										Initial password (optional)
									</p>
									<label className="grid gap-1 text-sm">
										<span className="text-muted-foreground">Password</span>
										<input
											type="password"
											autoComplete="new-password"
											className="rounded-lg border bg-background px-3 py-2"
											value={customPassword}
											onChange={(e) => setCustomPassword(e.target.value)}
											placeholder="Leave blank to auto-generate"
										/>
									</label>
									<PasswordStrengthPanel password={customPassword} />
									<label className="grid gap-1 text-sm">
										<span className="text-muted-foreground">
											Confirm password
										</span>
										<input
											type="password"
											autoComplete="new-password"
											className="rounded-lg border bg-background px-3 py-2"
											value={customPasswordConfirm}
											onChange={(e) => setCustomPasswordConfirm(e.target.value)}
											placeholder="Repeat if setting a password"
										/>
									</label>
								</div>
								<SheetFooter className="flex-col gap-2 sm:flex-row">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setSheetOpen(false);
											resetAddForm();
										}}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={creating}>
										{creating ? "Creating…" : "Create athlete"}
									</Button>
								</SheetFooter>
							</form>
						</SheetContent>
					</Sheet>

					{roster && roster.members.length > 0 ? (
						<div className="space-y-2">
							<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Roster
							</p>
							<ul className="grid gap-2 sm:grid-cols-2">
								{roster.members.map((m) => (
									<li key={m.athleteId}>
										<Link
											to="/portal/team/$athleteId"
											params={{ athleteId: String(m.athleteId) }}
											className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
										>
											<div className="flex h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
												{m.profilePicture ? (
													<img
														src={m.profilePicture}
														alt=""
														className="h-full w-full object-cover"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
														{m.name.slice(0, 1).toUpperCase()}
													</div>
												)}
											</div>
											<div className="min-w-0 flex-1">
												<p className="font-semibold truncate">{m.name}</p>
												<p className="truncate font-mono text-xs text-muted-foreground">
													{m.email}
												</p>
											</div>
											<ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</>
			) : (
				<p className="text-sm text-destructive">Could not load roster.</p>
			)}
		</div>
	);
}
