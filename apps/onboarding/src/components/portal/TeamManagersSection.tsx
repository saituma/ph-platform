import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortal } from "@/portal/PortalContext";
import {
	fetchTeamManagers,
	inviteCoManager,
	removeCoManager,
	teamManagersQueryKeys,
} from "@/services/teamManagersService";

export function TeamManagersSection() {
	const { token } = usePortal();
	const queryClient = useQueryClient();

	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [creds, setCreds] = useState<{
		email: string;
		temporaryPassword: string;
	} | null>(null);

	const managersQ = useQuery({
		queryKey: teamManagersQueryKeys.list(token),
		queryFn: fetchTeamManagers,
		enabled: !!token,
	});

	const data = managersQ.data;
	const isPrimary = data?.isPrimary ?? false;

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: teamManagersQueryKeys.all });

	const inviteM = useMutation({
		mutationFn: () =>
			inviteCoManager({ email: email.trim(), name: name.trim() || undefined }),
		onSuccess: (res) => {
			if (res.created && res.temporaryPassword) {
				setCreds({
					email: res.email,
					temporaryPassword: res.temporaryPassword,
				});
			} else {
				setCreds(null);
			}
			setEmail("");
			setName("");
			toast.success("Co-manager added.");
			void invalidate();
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to add co-manager",
			),
	});

	const removeM = useMutation({
		mutationFn: (userId: number) => removeCoManager(userId),
		onSuccess: () => {
			toast.success("Co-manager removed.");
			void invalidate();
		},
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to remove co-manager",
			),
	});

	return (
		<section className="space-y-4 rounded-2xl border bg-card p-5">
			<div className="space-y-1">
				<h2 className="text-lg font-black uppercase italic tracking-tight">
					Managers
				</h2>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Co-managers get full access to your roster, athletes, nutrition, and
					chat. They cannot change billing or delete the team.
				</p>
			</div>

			{data?.primary ? (
				<div className="rounded-xl border bg-muted/30 p-3">
					<p className="text-xs text-muted-foreground">
						Primary manager (billing owner)
					</p>
					<p className="mt-1 text-sm font-semibold">
						{data.primary.name || data.primary.email}
					</p>
					<p className="text-xs text-muted-foreground break-all">
						{data.primary.email}
					</p>
				</div>
			) : null}

			<div className="space-y-2">
				{managersQ.isLoading ? (
					<p className="text-sm text-muted-foreground">Loading…</p>
				) : data && data.coManagers.length > 0 ? (
					data.coManagers.map((cm) => (
						<div
							key={cm.userId}
							className="flex items-center justify-between gap-3 rounded-xl border p-3"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold">
									{cm.name || "—"}
								</p>
								<p className="truncate text-xs text-muted-foreground break-all">
									{cm.email}
								</p>
							</div>
							{isPrimary ? (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeM.mutate(cm.userId)}
									disabled={removeM.isPending}
									aria-label={`Remove ${cm.email}`}
								>
									<Trash2 className="h-4 w-4" aria-hidden />
								</Button>
							) : null}
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground">No co-managers yet.</p>
				)}
			</div>

			{isPrimary ? (
				<div className="space-y-3 border-t pt-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1">
							<Label htmlFor="co-manager-email">Email</Label>
							<Input
								id="co-manager-email"
								type="email"
								placeholder="coach@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="co-manager-name">Name (optional)</Label>
							<Input
								id="co-manager-name"
								placeholder="Jane Doe"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
					</div>
					<Button
						onClick={() => inviteM.mutate()}
						disabled={inviteM.isPending || !email.trim()}
						className="gap-2"
					>
						<UserPlus className="h-4 w-4" aria-hidden />
						{inviteM.isPending ? "Adding…" : "Add co-manager"}
					</Button>

					{creds ? (
						<div className="rounded-xl border bg-muted/30 p-3">
							<p className="text-xs text-muted-foreground">
								New account created. Share these securely — the password is
								shown only once.
							</p>
							<p className="mt-2 text-sm">
								<span className="text-muted-foreground">Login email: </span>
								<span className="font-semibold break-all">{creds.email}</span>
							</p>
							<p className="text-sm">
								<span className="text-muted-foreground">
									Temporary password:{" "}
								</span>
								<span className="font-mono font-semibold">
									{creds.temporaryPassword}
								</span>
							</p>
						</div>
					) : null}
				</div>
			) : null}
		</section>
	);
}
