import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { config } from "../lib/config";

export function WaitlistModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${config.api.baseUrl}/api/waitlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), email: email.trim() }),
            });
            if (!res.ok) throw new Error("Failed to join waitlist");
            setDone(true);
        } catch {
            toast.error("Something went wrong. Please try again.");
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
                className="relative w-full max-w-[420px] bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition"
                >
                    <X size={18} />
                </button>

                {done ? (
                    <div className="px-8 py-10 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#8aff00]/10">
                            <Check size={22} className="text-[#8aff00]" />
                        </div>
                        <p className="text-white font-bold text-lg mb-1">You're on the list!</p>
                        <p className="text-white/40 text-sm">We'll be in touch when your access is ready.</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-6 text-[#8aff00] text-xs font-bold uppercase tracking-widest hover:opacity-80 transition"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div className="px-8 py-8">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8aff00] mb-2">PH Performance App</p>
                        <h2 className="text-white text-xl font-bold mb-1">Join the Waitlist</h2>
                        <p className="text-white/40 text-xs leading-relaxed mb-6">
                            Track programmes, log nutrition, monitor GPS running data, book sessions, and review progress — all in one place.
                        </p>
                        <form onSubmit={submit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8aff00]/50 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8aff00]/50 transition"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 flex items-center justify-center gap-2 bg-[#8aff00] text-black text-[11px] font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-[#7aef00] transition disabled:opacity-60"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                                {loading ? "Joining…" : "Join Waitlist"}
                            </button>
                        </form>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
