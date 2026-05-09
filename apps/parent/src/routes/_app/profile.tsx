import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { User, Phone, Mail, Shield } from "lucide-react";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { clearAuthToken } from "#/lib/client-storage";

export const Route = createFileRoute("/_app/profile")({
	component: ProfilePage,
});

type Me = {
	id: string;
	name: string;
	email: string;
	role: string;
	guardian?: {
		id: string;
		phoneNumber: string | null;
		relationToAthlete: string | null;
	} | null;
};

function ProfilePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);

	const { data: me, isLoading } = useQuery<Me>({
		queryKey: queryKeys.me,
		queryFn: () => api.get<Me>("/api/portal/me"),
	});

	const updateMutation = useMutation({
		mutationFn: (body: unknown) => api.patch("/api/portal/me", body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.me });
			toast.success("Profile updated");
			setIsEditing(false);
		},
		onError: () => toast.error("Failed to update profile"),
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		updateMutation.mutate({
			name: formData.get("name") as string,
			phone: (formData.get("phone") as string) || undefined,
		});
	};

	const handleDeleteAccount = async () => {
		if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
		try {
			await api.delete("/api/portal/me");
			await clearAuthToken();
			queryClient.clear();
			navigate({ to: "/login", replace: true });
		} catch {
			toast.error("Failed to delete account");
		}
	};

	if (isLoading) {
		return (
			<div className="p-6 max-w-lg mx-auto animate-pulse space-y-4">
				<div className="h-6 bg-muted w-1/3" />
				<div className="h-32 bg-muted" />
			</div>
		);
	}

	return (
		<div className="p-6 max-w-lg mx-auto space-y-6">
			<div className="space-y-1">
				<p className="label-mono">Account</p>
				<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Profile</h1>
				<p className="text-muted-foreground text-sm">Manage your account information</p>
			</div>

			{/* Avatar card */}
			<div className="bento-card p-5 flex items-center gap-4">
				<div className="w-14 h-14 bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
					<span className="font-black text-xl" style={{ color: "var(--acid)" }}>
						{me?.name?.charAt(0)?.toUpperCase() ?? "P"}
					</span>
				</div>
				<div>
					<div className="font-black text-foreground uppercase tracking-wide">{me?.name}</div>
					<div className="text-sm text-muted-foreground font-mono">{me?.email}</div>
					<div className="text-xs text-muted-foreground font-mono mt-0.5 capitalize">
						{me?.guardian?.relationToAthlete ?? "Guardian"}
					</div>
				</div>
			</div>

			{/* Edit form */}
			{isEditing ? (
				<form onSubmit={handleSubmit} className="bento-card p-5 space-y-4">
					<h2 className="label-mono">Edit profile</h2>

					<div className="space-y-2">
						<label htmlFor="name" className="label-mono flex items-center gap-1.5">
							<User size={12} /> Full name
						</label>
						<input
							id="name"
							name="name"
							type="text"
							defaultValue={me?.name}
							required
							className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="phone" className="label-mono flex items-center gap-1.5">
							<Phone size={12} /> Phone
						</label>
						<input
							id="phone"
							name="phone"
							type="tel"
							defaultValue={me?.guardian?.phoneNumber ?? ""}
							className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
							placeholder="+44 7700 000000"
						/>
					</div>

					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => setIsEditing(false)}
							className="flex-1 py-2.5 border border-border text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={updateMutation.isPending}
							className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-60 transition-opacity"
						>
							{updateMutation.isPending ? "Saving…" : "Save changes"}
						</button>
					</div>
				</form>
			) : (
				<div className="bento-card divide-y divide-border">
					{[
						{ icon: User,   label: "Name",     value: me?.name },
						{ icon: Mail,   label: "Email",    value: me?.email },
						{ icon: Phone,  label: "Phone",    value: me?.guardian?.phoneNumber ?? "Not set" },
						{ icon: Shield, label: "Role",     value: me?.guardian?.relationToAthlete ?? "Guardian" },
					].map(({ icon: Icon, label, value }) => (
						<div key={label} className="flex items-center gap-3 px-5 py-3.5">
							<Icon size={14} className="text-muted-foreground" />
							<div className="flex-1 min-w-0">
								<div className="label-mono">{label}</div>
								<div className="text-sm font-medium text-foreground truncate mt-0.5">{value}</div>
							</div>
						</div>
					))}
				</div>
			)}

			{!isEditing && (
				<button
					type="button"
					onClick={() => setIsEditing(true)}
					className="w-full py-2.5 border border-border text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
				>
					Edit profile
				</button>
			)}

			{/* Danger zone */}
			<div className="pt-2">
				<div className="border border-red-200 p-4 space-y-2">
					<h3 className="label-mono text-red-700">Danger zone</h3>
					<p className="text-xs text-red-600/80 font-mono leading-relaxed">
						Deleting your account will permanently remove all your data. This cannot be undone.
					</p>
					<button
						type="button"
						onClick={handleDeleteAccount}
						className="px-4 py-2 border border-red-300 text-red-700 text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-colors"
					>
						Delete account
					</button>
				</div>
			</div>
		</div>
	);
}
