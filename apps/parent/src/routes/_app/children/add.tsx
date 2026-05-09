import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/children/add")({
	component: AddChildPage,
});

const addChildSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	age: z.coerce.number().int().min(4).max(99).optional(),
	athleteType: z.enum(["youth", "adult"]),
	injuries: z.string().optional(),
	performanceGoals: z.string().optional(),
});

function AddChildPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [athleteType, setAthleteType] = useState<"youth" | "adult">("youth");

	const { mutate, isPending } = useMutation({
		mutationFn: (body: unknown) => api.post("/api/portal/guardian/children", body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.children });
			toast.success("Child added successfully");
			navigate({ to: "/children" });
		},
		onError: (err: unknown) => {
			toast.error("Failed to add child", {
				description: err instanceof Error ? err.message : "Please try again.",
			});
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const fields = {
			name: formData.get("name") as string,
			age: formData.get("age") ? Number(formData.get("age")) : undefined,
			athleteType,
			injuries: (formData.get("injuries") as string) || undefined,
			performanceGoals: (formData.get("performanceGoals") as string) || undefined,
		};
		const result = addChildSchema.safeParse(fields);
		if (!result.success) {
			for (const issue of result.error.issues) toast.error(issue.message);
			return;
		}
		mutate(result.data);
	};

	return (
		<div className="p-6 max-w-lg mx-auto space-y-6">
			<button
				type="button"
				onClick={() => navigate({ to: "/children" })}
				className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
			>
				<ArrowLeft size={14} /> Back to children
			</button>

			<div className="space-y-1">
				<p className="label-mono">Add athlete</p>
				<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Add child</h1>
				<p className="text-muted-foreground text-sm">Register your child to track their training</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5">
				<div className="space-y-2">
					<label htmlFor="name" className="label-mono">Full name</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
						placeholder="Alex Smith"
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="age" className="label-mono">
						Age <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">(optional)</span>
					</label>
					<input
						id="age"
						name="age"
						type="number"
						min={4}
						max={99}
						className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
						placeholder="15"
					/>
				</div>

				<div className="space-y-2">
					<label className="label-mono">Athlete type</label>
					<div className="grid grid-cols-2 gap-2">
						{(["youth", "adult"] as const).map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => setAthleteType(type)}
								className={cn(
									"py-2.5 border-2 text-sm font-bold uppercase tracking-wide transition-all",
									athleteType === type
										? "border-primary bg-primary/5 text-primary"
										: "border-border text-muted-foreground hover:border-primary/40",
								)}
							>
								{type} athlete
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<label htmlFor="performanceGoals" className="label-mono">
						Performance goals <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">(optional)</span>
					</label>
					<textarea
						id="performanceGoals"
						name="performanceGoals"
						rows={2}
						className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
						placeholder="e.g. Improve sprint speed, qualify for county trials"
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="injuries" className="label-mono">
						Medical notes <span className="text-muted-foreground/60 font-normal normal-case tracking-normal">(optional)</span>
					</label>
					<textarea
						id="injuries"
						name="injuries"
						rows={2}
						className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
						placeholder="e.g. Previous ankle sprain"
					/>
				</div>

				<div className="flex gap-3 pt-1">
					<button
						type="button"
						onClick={() => navigate({ to: "/children" })}
						className="flex-1 py-2.5 px-4 border border-border text-sm font-bold uppercase tracking-wide text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-60 transition-opacity"
					>
						{isPending ? "Adding…" : "Add child"}
					</button>
				</div>
			</form>
		</div>
	);
}
