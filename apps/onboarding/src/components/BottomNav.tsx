import { motion } from "framer-motion";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

interface BottomNavProps {
	children: React.ReactNode;
}

export function BottomNav({ children }: BottomNavProps) {
	return (
		<SidebarProvider>
			<nav aria-label="Portal navigation">
				<AppSidebar />
			</nav>
			<SidebarInset className="flex flex-col min-h-svh bg-background">
				<motion.main
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					className="flex-1 overflow-y-auto"
				>
					{children}
				</motion.main>

				<footer className="flex h-14 shrink-0 items-center gap-2 border-t border-foreground/[0.06] px-4 md:hidden bg-background sticky bottom-0 z-50">
					<SidebarTrigger className="h-10 w-10 flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors" />

					<div className="flex flex-1 flex-col items-center justify-center">
						<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
							PH Performance
						</span>
					</div>

					<div className="w-10 h-10 flex items-center justify-center">
						<motion.div
							animate={{ opacity: [0.3, 0.6, 0.3] }}
							transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
							className="h-1.5 w-1.5 rounded-full bg-primary"
						/>
					</div>
				</footer>
			</SidebarInset>
		</SidebarProvider>
	);
}
