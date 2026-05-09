import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft, BookOpen, Activity, Calendar, Target,
	Pencil, Check, X, CheckCircle2, XCircle, Clock, MapPin, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/children/$athleteId")({
	component: ChildDetailPage,
});

type Program = {
	id: string;
	name: string;
	description?: string | null;
	totalSessions: number;
	completedSessions: number;
	tier?: string | null;
	status: string;
};

type SessionLog = {
	id: string;
	date: string;
	type: string;
	completed: boolean;
	notes?: string | null;
};

type AthleteDetail = {
	id: number;
	name: string;
	age: number | null;
	athleteType: string;
	team?: { name: string } | null;
	currentProgramTier?: string | null;
	performanceGoals?: string | null;
	injuries?: string | null;
	programs: Program[];
	recentSessions: SessionLog[];
};

type AttendanceSession = {
	id: number;
	sessionName: string;
	sessionType: string;
	startsAt: string;
	endsAt: string;
	location: string | null;
	status: "attended" | "missed" | "unmarked";
	checkInAt: string | null;
};

type AttendanceData = {
	summary: { total: number; attended: number; missed: number; rate: number };
	sessions: AttendanceSession[];
};

function ChildDetailPage() {
	const { athleteId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [editingInjuries, setEditingInjuries] = useState(false);
	const [injuriesText, setInjuriesText] = useState("");
	const [attendanceOpen, setAttendanceOpen] = useState(false);

	const { data: child, isLoading } = useQuery<AthleteDetail>({
		queryKey: queryKeys.child(athleteId),
		queryFn: () => api.get<AthleteDetail>(`/api/portal/guardian/children/${athleteId}`),
	});

	const { data: attendance, isLoading: attendanceLoading } = useQuery<AttendanceData>({
		queryKey: ["child-attendance", athleteId],
		queryFn: () => api.get<AttendanceData>(`/api/portal/guardian/children/${athleteId}/attendance`),
		enabled: attendanceOpen,
	});

	const saveMedical = useMutation({
		mutationFn: (injuries: string) =>
			api.patch(`/api/portal/guardian/children/${athleteId}/medical`, { injuries }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.child(athleteId) });
			setEditingInjuries(false);
			toast.success("Medical notes updated");
		},
		onError: () => toast.error("Failed to save"),
	});

	if (isLoading) {
		return (
			<div className="p-6 max-w-3xl mx-auto">
				<div className="animate-pulse space-y-4">
					<div className="h-5 bg-muted w-32" />
					<div className="h-8 bg-muted w-48" />
					<div className="grid grid-cols-2 gap-3">
						{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted" />)}
					</div>
				</div>
			</div>
		);
	}

	if (!child) {
		return (
			<div className="p-6 max-w-3xl mx-auto text-center pt-20">
				<p className="text-muted-foreground font-mono">Child not found.</p>
				<button type="button" onClick={() => navigate({ to: "/children" })} className="mt-4 text-primary text-sm hover:underline font-mono">
					Back to children
				</button>
			</div>
		);
	}

	const totalSessions = child.programs.reduce((s, p) => s + p.totalSessions, 0);
	const completedSessions = child.programs.reduce((s, p) => s + p.completedSessions, 0);
	const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

	const statusIcon = (s: AttendanceSession["status"]) => {
		if (s === "attended") return <CheckCircle2 size={14} className="text-primary flex-shrink-0" />;
		if (s === "missed")   return <XCircle size={14} className="text-destructive flex-shrink-0" />;
		return <Clock size={14} className="text-muted-foreground/50 flex-shrink-0" />;
	};

	return (
		<div className="flex h-full overflow-hidden">
			{/* Main content */}
			<div className={cn("flex-1 overflow-y-auto transition-all duration-300", attendanceOpen ? "lg:mr-80" : "")}>
				<div className="p-6 max-w-3xl mx-auto space-y-6">
					<div className="flex items-center justify-between">
						<button
							type="button"
							onClick={() => navigate({ to: "/children" })}
							className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
						>
							<ArrowLeft size={14} /> Back to children
						</button>
						<button
							type="button"
							onClick={() => setAttendanceOpen((v) => !v)}
							className={cn(
								"flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-all border",
								attendanceOpen
									? "bg-primary text-primary-foreground border-primary"
									: "border-border text-foreground/70 hover:border-primary/40 hover:text-foreground",
							)}
						>
							<Calendar size={12} /> Attendance
							<ChevronRight size={12} className={cn("transition-transform", attendanceOpen && "rotate-180")} />
						</button>
					</div>

					{/* Header */}
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-primary/10 flex items-center justify-center flex-shrink-0">
							<span className="text-primary font-black text-xl">{child.name.charAt(0)}</span>
						</div>
						<div>
							<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">{child.name}</h1>
							<div className="flex items-center gap-2 mt-1 flex-wrap">
								{child.age && <span className="text-sm text-muted-foreground font-mono">Age {child.age}</span>}
								<span className={cn(
									"px-2 py-0.5 text-xs font-mono border",
									child.athleteType === "youth" ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border",
								)}>
									{child.athleteType}
								</span>
								{child.team && (
									<span className="px-2 py-0.5 text-xs font-mono border border-border bg-muted text-muted-foreground">
										{child.team.name}
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{[
							{ label: "Programs",      value: child.programs.length, icon: BookOpen },
							{ label: "Sessions done", value: completedSessions,     icon: Activity },
							{ label: "Total",         value: totalSessions,         icon: Calendar },
							{ label: "Progress",      value: `${progressPct}%`,     icon: Target },
						].map(({ label, value, icon: Icon }) => (
							<div key={label} className="bento-card p-4">
								<Icon size={13} className="text-primary mb-2" />
								<div className="text-2xl font-black text-foreground">{value}</div>
								<div className="label-mono mt-0.5">{label}</div>
							</div>
						))}
					</div>

					{/* Programs */}
					{child.programs.length > 0 && (
						<section className="space-y-3">
							<h2 className="label-mono">Assigned Programs</h2>
							<div className="space-y-2">
								{child.programs.map((program) => {
									const pct = program.totalSessions > 0 ? Math.round((program.completedSessions / program.totalSessions) * 100) : 0;
									return (
										<div key={program.id} className="bento-card p-4">
											<div className="flex items-start justify-between gap-2 mb-3">
												<div>
													<div className="font-bold text-sm text-foreground">{program.name}</div>
													{program.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-mono">{program.description}</div>}
												</div>
												{program.tier && (
													<span className="px-2 py-0.5 text-xs font-mono bg-primary/5 text-primary border border-primary/20 flex-shrink-0">{program.tier}</span>
												)}
											</div>
											<div className="flex items-center gap-3">
												<div className="flex-1 h-1 bg-muted overflow-hidden">
													<div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
												</div>
												<span className="text-xs text-muted-foreground font-mono w-20 text-right">
													{program.completedSessions}/{program.totalSessions}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						</section>
					)}

					{/* Performance goals */}
					{child.performanceGoals && (
						<section className="space-y-2">
							<h2 className="label-mono">Performance Goals</h2>
							<div className="bento-card p-4">
								<p className="text-sm text-foreground">{child.performanceGoals}</p>
							</div>
						</section>
					)}

					{/* Recent session logs */}
					{child.recentSessions?.length > 0 && (
						<section className="space-y-3">
							<h2 className="label-mono">Recent Training Sessions</h2>
							<div className="space-y-2">
								{child.recentSessions.map((session) => (
									<div key={session.id} className="bento-card p-3.5 flex items-center gap-3">
										<div className={cn("w-2 h-2 flex-shrink-0", session.completed ? "bg-primary" : "bg-muted-foreground/30")} />
										<div className="flex-1 min-w-0">
											<div className="text-sm font-bold text-foreground">{session.type}</div>
											{session.notes && <div className="text-xs text-muted-foreground font-mono truncate">{session.notes}</div>}
										</div>
										<div className="text-xs text-muted-foreground font-mono flex-shrink-0">
											{format(new Date(session.date), "MMM d")}
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{/* Medical notes */}
					<section className="space-y-2">
						<div className="flex items-center justify-between">
							<h2 className="label-mono">Medical Notes</h2>
							{!editingInjuries && (
								<button
									type="button"
									onClick={() => { setInjuriesText(child.injuries ?? ""); setEditingInjuries(true); }}
									className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
								>
									<Pencil size={11} /> Edit
								</button>
							)}
						</div>
						{editingInjuries ? (
							<div className="bento-card p-4 space-y-3">
								<textarea
									value={injuriesText}
									onChange={(e) => setInjuriesText(e.target.value)}
									rows={4}
									maxLength={1000}
									placeholder="Note any injuries, conditions or medical information…"
									className="w-full px-3 py-2 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed transition-all"
								/>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => saveMedical.mutate(injuriesText)}
										disabled={saveMedical.isPending}
										className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
									>
										<Check size={11} /> {saveMedical.isPending ? "Saving…" : "Save"}
									</button>
									<button
										type="button"
										onClick={() => setEditingInjuries(false)}
										className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
									>
										<X size={11} /> Cancel
									</button>
								</div>
							</div>
						) : child.injuries ? (
							<div className="border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
								<p className="text-sm text-amber-800 dark:text-amber-300">{child.injuries}</p>
							</div>
						) : (
							<div className="bento-card p-4">
								<p className="text-sm text-muted-foreground font-mono">No medical notes recorded.</p>
							</div>
						)}
					</section>
				</div>
			</div>

			{/* Attendance sidebar */}
			{attendanceOpen && (
				<aside className="fixed right-0 top-0 h-full w-80 bg-sidebar border-l border-sidebar-border flex flex-col z-20 shadow-xl lg:absolute">
					{/* Header */}
					<div className="flex items-center justify-between px-5 h-14 border-b border-sidebar-border flex-shrink-0">
						<div>
							<span className="label-mono block">Session</span>
							<span className="font-black text-sm uppercase tracking-tight text-sidebar-foreground">Attendance</span>
						</div>
						<button type="button" onClick={() => setAttendanceOpen(false)} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors">
							<X size={16} />
						</button>
					</div>

					{attendanceLoading ? (
						<div className="flex-1 flex items-center justify-center">
							<div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
						</div>
					) : !attendance || attendance.sessions.length === 0 ? (
						<div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
							<Calendar size={32} className="text-muted-foreground/20" />
							<p className="label-mono">No sessions recorded</p>
							<p className="text-xs text-muted-foreground font-mono">Sessions will appear here once scheduled by your coach.</p>
						</div>
					) : (
						<>
							{/* Summary */}
							<div className="px-5 py-4 border-b border-sidebar-border grid grid-cols-3 gap-3 flex-shrink-0">
								<div className="text-center">
									<div className="text-xl font-black text-sidebar-foreground">{attendance.summary.attended}</div>
									<div className="label-mono text-primary">Attended</div>
								</div>
								<div className="text-center">
									<div className="text-xl font-black text-sidebar-foreground">{attendance.summary.missed}</div>
									<div className="label-mono text-destructive">Missed</div>
								</div>
								<div className="text-center">
									<div className="text-xl font-black text-sidebar-foreground">{attendance.summary.rate}%</div>
									<div className="label-mono">Rate</div>
								</div>
							</div>

							{/* Rate bar */}
							<div className="px-5 py-3 border-b border-sidebar-border flex-shrink-0">
								<div className="h-1.5 bg-sidebar-border overflow-hidden">
									<div
										className="h-full bg-primary transition-all"
										style={{ width: `${attendance.summary.rate}%` }}
									/>
								</div>
							</div>

							{/* Session list */}
							<div className="flex-1 overflow-y-auto">
								{attendance.sessions.map((s) => (
									<div key={s.id} className="flex items-start gap-3 px-5 py-3.5 border-b border-sidebar-border/50 hover:bg-sidebar-accent/40 transition-colors">
										<div className="mt-0.5">{statusIcon(s.status)}</div>
										<div className="flex-1 min-w-0">
											<div className={cn(
												"text-xs font-bold uppercase tracking-tight truncate",
												s.status === "attended" ? "text-sidebar-foreground" : s.status === "missed" ? "text-destructive/80" : "text-sidebar-foreground/50",
											)}>
												{s.sessionName}
											</div>
											<div className="text-xs text-sidebar-foreground/50 font-mono mt-0.5">
												{format(new Date(s.startsAt), "EEE d MMM · HH:mm")}
											</div>
											{s.location && (
												<div className="flex items-center gap-1 mt-0.5">
													<MapPin size={9} className="text-sidebar-foreground/30" />
													<span className="text-[10px] text-sidebar-foreground/40 font-mono truncate">{s.location}</span>
												</div>
											)}
										</div>
										<span className={cn(
											"text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 flex-shrink-0",
											s.status === "attended" ? "bg-primary/10 text-primary" :
											s.status === "missed"   ? "bg-destructive/10 text-destructive" :
											"bg-muted text-muted-foreground",
										)}>
											{s.status}
										</span>
									</div>
								))}
							</div>
						</>
					)}
				</aside>
			)}
		</div>
	);
}
