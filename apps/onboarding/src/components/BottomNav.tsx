import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
	const router = useRouter();
	const [currentPath, setCurrentPath] = useState(
		router.state.location.pathname,
	);

	useEffect(() => {
		setCurrentPath(router.state.location.pathname);
	}, [router.state.location.pathname]);

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex flex-col min-h-svh bg-background">
				{/* Main Content Area */}
				<main className="flex-1 overflow-y-auto">
					{children}
				</main>

				{/* Mobile Navigation Bar at the Bottom */}
				<footer className="flex h-20 shrink-0 items-center gap-2 border-t px-6 md:hidden bg-card/95 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.2)] sticky bottom-0 z-50">
					<SidebarTrigger className="h-12 w-12 rounded-2xl bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300" />
					
					<div className="flex flex-1 flex-col items-center justify-center">
						<span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-0.5">Platform</span>
						<span className="text-sm font-black uppercase italic tracking-tighter text-foreground">
							PH App
						</span>
					</div>
					
					<div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary/5">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
				</footer>
			</SidebarInset>
		</SidebarProvider>
	);
}
