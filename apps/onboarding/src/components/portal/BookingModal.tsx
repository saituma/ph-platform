import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, MapPin, Video, Info, Lock, Users } from "lucide-react";
import {
  fetchBookingServices,
  createBooking,
  fetchGeneratedAvailability,
  sumReportedOpeningsForService,
} from "@/services/scheduleService";
import { toast } from "sonner";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess: () => void;
}

export function BookingModal({ isOpen, onClose, token, onSuccess }: BookingModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [calPreview, setCalPreview] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    occurrenceCount: number;
    openingsSum: number | null;
  }>({ status: "idle", occurrenceCount: 0, openingsSum: null });

  useEffect(() => {
    if (isOpen && token) {
      setConfirmed(false);
      setNotes("");
      setSelectedServiceId(null);
      setCalPreview({ status: "idle", occurrenceCount: 0, openingsSum: null });
      loadServices();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen || !token || !selectedServiceId) {
      setCalPreview({ status: "idle", occurrenceCount: 0, openingsSum: null });
      return;
    }
    let cancelled = false;
    setCalPreview({ status: "loading", occurrenceCount: 0, openingsSum: null });
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 21);
    (async () => {
      try {
        const items = await fetchGeneratedAvailability(token, {
          from,
          to,
          serviceTypeId: selectedServiceId,
        });
        if (cancelled) return;
        const { occurrenceCount, openingsSum } = sumReportedOpeningsForService(items, selectedServiceId);
        setCalPreview({ status: "ready", occurrenceCount, openingsSum });
      } catch {
        if (!cancelled) setCalPreview({ status: "error", occurrenceCount: 0, openingsSum: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, token, selectedServiceId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await fetchBookingServices(token!);
      const active = data.filter((s: any) => s.isActive !== false);
      setServices(active);
      if (active.length > 0) {
        setSelectedServiceId(active[0].id);
      }
    } catch (err) {
      toast.error("Failed to load booking services");
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(s => s.id === selectedServiceId);

  /** Service-level cap + coach-published calendar windows (generated availability). */
  const availabilityCard = (() => {
    const s = selectedService;
    if (!s) return null;
    const cap = s.capacity;
    const rem = s.remainingCapacity;
    const total = s.totalSlots;
    const remTotal = s.remainingTotalSlots;
    const lines: string[] = [];
    let tone: "full" | "ok" | "hint" | "info" = "info";

    if (total != null && remTotal != null) {
      if (remTotal <= 0) {
        lines.push("No booking slots left for this service.");
        tone = "full";
      } else {
        lines.push(`${remTotal} of ${total} booking slot${total === 1 ? "" : "s"} left for this service.`);
        tone = "ok";
      }
    }

    if (total == null && cap != null && rem != null) {
      if (rem <= 0) {
        lines.push("No spots left for this session type (per-session limit reached).");
        tone = "full";
      } else {
        lines.push(`${rem} of ${cap} spot${cap === 1 ? "" : "s"} open for this type (per session).`);
        if (tone === "info") tone = "ok";
      }
    } else if (total == null && cap != null && rem == null) {
      lines.push(
        `Up to ${cap} athlete${cap === 1 ? "" : "s"} per session — pick a date on your schedule to see openings.`,
      );
      if (tone === "info") tone = "hint";
    }

    if (calPreview.status === "loading") {
      lines.push("Checking published session times on the calendar…");
    } else if (calPreview.status === "ready") {
      const { occurrenceCount, openingsSum } = calPreview;
      if (occurrenceCount > 0 && openingsSum != null) {
        if (openingsSum <= 0) {
          lines.push(
            `All ${occurrenceCount} published time(s) in the next 3 weeks look fully booked from here — you can still send a request and your coach may add more.`,
          );
          if (tone !== "full") tone = "full";
        } else {
          lines.push(
            `Up to ${openingsSum} opening(s) across ${occurrenceCount} published time(s) in the next 3 weeks.`,
          );
          if (tone === "info") tone = "ok";
        }
      } else if (occurrenceCount > 0) {
        lines.push(
          `${occurrenceCount} published time(s) on the calendar in the next 3 weeks — capacity isn’t shown for each; your coach confirms your slot.`,
        );
        if (tone === "info") tone = "hint";
      } else if (occurrenceCount === 0) {
        lines.push(
          "No coach-published times in the next 3 weeks for this type yet. Send a request and your coach will arrange a slot.",
        );
        if (tone === "info") tone = "hint";
      }
    } else if (calPreview.status === "error" && lines.length === 0) {
      lines.push(
        "You’re requesting this session type — your coach confirms date, time, and space after approval.",
      );
    }

    if (lines.length === 0) {
      lines.push(
        "You’re requesting this session type — not reserving a calendar slot here. Your coach confirms date, time, and space after approval.",
      );
    }

    return { tone, lines };
  })();

  const isBookingSlotsFull =
    selectedService?.totalSlots != null &&
    selectedService?.remainingTotalSlots != null &&
    selectedService.remainingTotalSlots <= 0;

  const handleSubmit = async () => {
    if (!token || !selectedService || submitting) return;
    const fullCap =
      selectedService.capacity != null &&
      selectedService.remainingCapacity != null &&
      selectedService.remainingCapacity <= 0;
    if (isBookingSlotsFull || fullCap) {
      toast.error(isBookingSlotsFull ? "No booking slots left for this service." : "This session is full.");
      return;
    }

    setSubmitting(true);
    try {
      let startsAt = new Date();
      if (selectedService.oneTimeDate) {
        startsAt = new Date(`${selectedService.oneTimeDate}T${selectedService.oneTimeTime || "09:00:00"}`);
      } else {
        // Default to tomorrow 12:00
        startsAt.setDate(startsAt.getDate() + 1);
        startsAt.setHours(12, 0, 0, 0);
      }

      const endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);

      await createBooking(token, {
        serviceTypeId: selectedService.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezoneOffsetMinutes: startsAt.getTimezoneOffset(),
        notes: notes.trim() || undefined,
      });

      setConfirmed(true);
      toast.success("Request sent!");
      onSuccess();
    } catch (err: any) {
      toast.error("Booking Error", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-card border rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              {confirmed ? "Request Sent" : "Request a Session"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {confirmed ? (
            <div className="space-y-6 py-4 text-center">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <p className="font-bold text-lg text-foreground uppercase italic">Awaiting Coach Approval</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your request has been sent to our coaches. You'll receive an email notification once your session is confirmed.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-wider shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose the session type you'd like to request. Our coaches will review and confirm your slot.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        disabled={service.isLocked}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
                          selectedServiceId === service.id
                            ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-muted border-transparent text-muted-foreground hover:border-border'
                        } ${service.isLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                      >
                        <span className="flex items-center gap-1.5">
                          {service.name}
                          {service.isLocked && <Lock className="w-3 h-3" />}
                        </span>
                      </button>
                    ))}
                  </div>

                  {selectedService?.description && (
                    <div className="p-4 bg-muted/30 rounded-2xl border border-dashed border-border flex gap-3">
                       <Info className="w-5 h-5 text-primary/60 shrink-0" />
                       <p className="text-xs text-muted-foreground italic leading-relaxed">
                          {selectedService.description}
                       </p>
                    </div>
                  )}

                  {availabilityCard && (
                    <div
                      className={`p-4 rounded-2xl border flex gap-3 ${
                        availabilityCard.tone === "full"
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : availabilityCard.tone === "hint"
                            ? "bg-muted/30 border-dashed border-border"
                            : availabilityCard.tone === "info"
                              ? "bg-muted/20 border-border"
                              : "bg-primary/5 border-primary/20"
                      }`}
                    >
                      <Users className="w-5 h-5 shrink-0 opacity-70 mt-0.5" />
                      <div className="space-y-2 min-w-0">
                        {availabilityCard.lines.map((line, i) => (
                          <p
                            key={i}
                            className={`text-xs leading-relaxed ${
                              availabilityCard.tone === "full" && i === 0 ? "font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="p-4 bg-card border rounded-2xl space-y-3">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <span>Location & Details</span>
                       </div>
                       <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                             <MapPin className="w-4 h-4 text-primary/60" />
                             <span className="font-medium">{selectedService?.defaultLocation || "TBD (Coach will confirm)"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                             <Video className="w-4 h-4 text-primary/60" />
                             <span className="font-medium text-primary underline truncate max-w-[200px]">
                                {selectedService?.defaultMeetingLink || "Link will be shared on confirmation"}
                             </span>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Notes for Coach (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Anything specific you'd like to discuss?"
                        className="w-full min-h-[100px] p-4 bg-muted/20 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmit}
                    disabled={
                      submitting ||
                      !selectedServiceId ||
                      isBookingSlotsFull ||
                      (selectedService?.capacity != null &&
                        selectedService?.remainingCapacity != null &&
                        selectedService.remainingCapacity <= 0)
                    }
                    className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-wider shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Send Request"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
