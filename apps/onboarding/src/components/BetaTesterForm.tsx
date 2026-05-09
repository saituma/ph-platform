import { useState } from "react";
import { FlaskConical, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { settingsService } from "@/services/settingsService";

export function BetaTesterForm({ userEmail, userName }: { userEmail?: string; userName?: string }) {
  const [name, setName] = useState(userName ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await settingsService.submitBetaTester({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-primary/20 bg-primary/5 p-6 text-center space-y-3"
      >
        <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
        <p className="text-sm font-medium text-foreground">You're on the list!</p>
        <p className="text-xs text-muted-foreground">
          We'll reach out when beta access is available. Thank you for your interest.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border border-foreground/[0.06] p-6 hover:border-foreground/[0.1] transition-colors duration-300"
    >
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="h-4 w-4 text-primary" />
        <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
          Beta Program
        </p>
      </div>
      <div className="space-y-1 mb-5">
        <h3 className="text-lg font-medium tracking-tight">Be a Beta Tester</h3>
        <p className="text-sm text-muted-foreground">
          Help us shape the future of PH Performance. Get early access to new features and provide feedback.
        </p>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm bg-transparent border border-foreground/[0.08] focus:border-foreground/20 outline-none transition-colors placeholder:text-muted-foreground/50"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm bg-transparent border border-foreground/[0.08] focus:border-foreground/20 outline-none transition-colors placeholder:text-muted-foreground/50"
          />
        </div>
        <input
          type="tel"
          placeholder="Phone number (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-transparent border border-foreground/[0.08] focus:border-foreground/20 outline-none transition-colors placeholder:text-muted-foreground/50"
        />
        <textarea
          placeholder="Why do you want to be a beta tester? (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 text-sm bg-transparent border border-foreground/[0.08] focus:border-foreground/20 outline-none transition-colors resize-none placeholder:text-muted-foreground/50"
        />
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 text-sm font-medium border border-foreground/[0.08] hover:bg-foreground/[0.03] hover:border-foreground/[0.15] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Join Beta Program"}
        </button>
      </form>
    </motion.div>
  );
}
