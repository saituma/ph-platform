import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, Loader2, X, PlayCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { config } from "../lib/config";

interface Props {
    onClose: () => void;
    apkUrl?: string;
}

type Step = "choose" | "email" | "done";

export function AndroidDownloadModal({ onClose, apkUrl }: Props) {
    const [step, setStep] = useState<Step>("choose");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const submitEmail = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${config.api.baseUrl}/api/beta-testers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: email.split("@")[0], email: email.trim() }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error ?? "Failed to register");
            }
            setStep("done");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Something went wrong";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-[440px] bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition z-10"
                >
                    <X size={18} />
                </button>

                <AnimatePresence mode="wait">
                    {step === "choose" && (
                        <motion.div
                            key="choose"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            className="px-8 py-8"
                        >
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8aff00] mb-2">Android App</p>
                            <h2 className="text-white text-xl font-bold mb-1">Get PH Performance</h2>
                            <p className="text-white/40 text-xs leading-relaxed mb-6">
                                Choose how you'd like to install the app on your Android device.
                            </p>

                            <div className="space-y-3">
                                {apkUrl ? (
                                    <a
                                        href={apkUrl}
                                        download="ph-performance.apk"
                                        onClick={onClose}
                                        className="flex items-center gap-4 w-full bg-white/5 border border-white/10 hover:border-[#8aff00]/40 rounded-xl px-5 py-4 transition group"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8aff00]/10 group-hover:bg-[#8aff00]/20 transition">
                                            <Download size={18} className="text-[#8aff00]" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white text-sm font-semibold">Download APK</p>
                                            <p className="text-white/40 text-xs mt-0.5">Install directly on your device</p>
                                        </div>
                                    </a>
                                ) : (
                                    <div className="flex items-center gap-4 w-full bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 opacity-50 cursor-not-allowed">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5">
                                            <Download size={18} className="text-white/40" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white/60 text-sm font-semibold">Download APK</p>
                                            <p className="text-white/30 text-xs mt-0.5">Coming soon</p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setStep("email")}
                                    className="flex items-center gap-4 w-full bg-white/5 border border-white/10 hover:border-[#8aff00]/40 rounded-xl px-5 py-4 transition group"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8aff00]/10 group-hover:bg-[#8aff00]/20 transition">
                                        <PlayCircle size={18} className="text-[#8aff00]" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white text-sm font-semibold">Join Play Store Testing</p>
                                        <p className="text-white/40 text-xs mt-0.5">Get early access via Google Play</p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === "email" && (
                        <motion.div
                            key="email"
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            className="px-8 py-8"
                        >
                            <button
                                type="button"
                                onClick={() => setStep("choose")}
                                className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition mb-4 flex items-center gap-1"
                            >
                                ← Back
                            </button>
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8aff00] mb-2">Play Store Testing</p>
                            <h2 className="text-white text-xl font-bold mb-1">Join Closed Testing</h2>
                            <p className="text-white/40 text-xs leading-relaxed mb-6">
                                Enter your Google account email. We'll add you to our Play Store closed testing group and you'll get a notification to install.
                            </p>
                            <form onSubmit={submitEmail} className="space-y-3">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
                                        Google Account Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@gmail.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8aff00]/50 transition"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 flex items-center justify-center gap-2 bg-[#8aff00] text-black text-[11px] font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[#7aef00] transition disabled:opacity-60"
                                >
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                                    {loading ? "Adding you…" : "Request Access"}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === "done" && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="px-8 py-10 text-center"
                        >
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#8aff00]/10">
                                <Check size={22} className="text-[#8aff00]" />
                            </div>
                            <p className="text-white font-bold text-lg mb-1">You're in!</p>
                            <p className="text-white/40 text-sm leading-relaxed mb-2">
                                Your email has been added to our Play Store closed testing group.
                            </p>
                            <p className="text-white/25 text-xs leading-relaxed">
                                Check your Google Play app for a testing invite, or visit the Play Store and search for <span className="text-white/40">PH Performance</span>.
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-6 text-[#8aff00] text-xs font-bold uppercase tracking-widest hover:opacity-80 transition"
                            >
                                Close
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
