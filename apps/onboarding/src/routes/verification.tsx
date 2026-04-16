import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "#/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
    ArrowLeftIcon,
    ClockIcon,
    EnvelopeSimpleIcon,
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/verification")({
    component: VerificationComponent,
});

function VerificationComponent() {
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    const handleChange = (value: string, index: number) => {
        const digit = value.slice(-1);
        if (digit && !/^\d$/.test(digit)) return;

        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        if (digit && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number,
    ) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").slice(0, 6).split("");
        if (data.every((char) => /^\d$/.test(char))) {
            const newOtp = [...otp];
            data.forEach((char, i) => {
                newOtp[i] = char;
            });
            setOtp(newOtp);
            const nextIndex = Math.min(data.length, 5);
            inputsRef.current[nextIndex]?.focus();
        }
    };

    const isComplete = otp.every((digit) => digit !== "");

    return (
        <main className="relative min-h-screen bg-background flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-primary/20">
            {/* Premium Background Accent */}
            <div
                className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
                style={{
                    background:
                        "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
                }}
            />

            <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
                <Link
                    to="/"
                    className="group mb-8 flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to login
                </Link>

                <Card className="w-full border-border shadow-2xl bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden ring-1 ring-border/50">
                    <CardHeader className="space-y-4 pt-10 text-center">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2 animate-bounce-subtle">
                            <EnvelopeSimpleIcon weight="duotone" className="w-8 h-8" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            Check your inbox
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="pt-4 pb-10 space-y-10">
                        <div
                            className="flex justify-between gap-3 sm:gap-4"
                            onPaste={handlePaste}
                        >
                            {otp.map((digit, i) => (
                                <Input
                                    key={i}
                                    ref={(el) => (inputsRef.current[i] = el)}
                                    value={digit}
                                    onChange={(e) => handleChange(e.target.value, i)}
                                    onKeyDown={(e) => handleKeyDown(e, i)}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    className="w-full h-20 text-center text-7xl font-black rounded-2xl border-2 border-input bg-background/50 focus-visible:ring-offset-0 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-300 shadow-sm"
                                    placeholder="•"
                                />
                            ))}
                        </div>

                        <Button
                            disabled={!isComplete}
                            className="w-full h-14 rounded-2xl text-lg font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-primary/20"
                        >
                            Verify Account
                        </Button>
                    </CardContent>

                    <CardFooter className="bg-muted/30 py-6 flex flex-col items-center space-y-3 border-t">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <ClockIcon className="w-4 h-4 mr-2" />
                            <span>Didn't receive the code?</span>
                        </div>
                        <Button
                            variant="ghost"
                            className="text-primary hover:text-primary hover:bg-primary/10 font-bold h-auto py-1.5 px-4 rounded-lg"
                        >
                            Resend Code
                        </Button>
                    </CardFooter>
                </Card>

                <p className="mt-8 text-xs text-muted-foreground text-center">
                    By verifying, you agree to our{" "}
                    <Link
                        to="/about"
                        className="text-primary hover:underline underline-offset-4"
                    >
                        Terms of Service
                    </Link>
                </p>
            </div>
        </main>
    );
}
