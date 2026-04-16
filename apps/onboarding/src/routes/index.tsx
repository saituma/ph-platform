import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/")({ component: App });

function App() {
    return (
        <main className="relative min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-primary/20">
            <div
                className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
                style={{
                    background:
                        "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
                }}
            />

            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center space-y-12 text-center animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
                <section className="space-y-6" id="hero">
                    <h1 className="text-5xl md:text-7xl font-bold font-bold-display tracking-tight text-foreground leading-[1.1]">
                        Build your future with{" "}
                        <span className="text-primary">PH Platform</span>
                    </h1>
                    <p className="text-lg md:text-2xl font-telma text-muted-foreground max-w-lg mx-auto">
                        Join thousands of creators building the next generation of
                        applications.
                    </p>
                </section>

                <section
                    className="flex flex-col items-center w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both"
                    id="auth-actions"
                >
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <Button
                            variant="outline"
                            className="h-12 w-full gap-3 transition-all duration-300 shadow-sm hover:shadow-md"
                            asChild
                        >
                            <Link to="/onboarding/create-account">
                                <img
                                    src="/svgs/apple.svg"
                                    alt=""
                                    className="w-5 h-5 -ml-1 sm:ml-0"
                                />
                                <span className="hidden sm:inline">Apple</span>
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 w-full gap-3 transition-all duration-300 shadow-sm hover:shadow-md"
                            asChild
                        >
                            <Link to="/onboarding/create-account">
                                <img src="/svgs/google.svg" alt="" className="w-5 h-5" />
                                <span className="hidden sm:inline">Google</span>
                            </Link>
                        </Button>
                    </div>

                    <div className="relative flex items-center w-full group">
                        <div className="flex-grow border-t border-muted group-hover:border-primary/20 transition-colors" />
                        <span className="mx-4 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
                            Or continue with email
                        </span>
                        <div className="flex-grow border-t border-muted group-hover:border-primary/20 transition-colors" />
                    </div>

                    <div className="group flex w-full overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
                        <Input
                            type="email"
                            placeholder="name@example.com"
                            aria-label="Email address"
                            className="flex-1 border-0 h-12 px-5 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/50"
                        />
                        <Button
                            variant="ghost"
                            className="h-12 w-12 p-0 rounded-none transition-colors"
                            aria-label="Submit email to create account"
                        >
                            <Link to="/verification">
                                <ArrowRightIcon weight="bold" className="w-5 h-5" />
                            </Link>
                        </Button>
                    </div>
                </section>

                <p className="text-xs text-muted-foreground animate-in fade-in duration-1000 delay-700 fill-mode-both">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </main>
    );
}
