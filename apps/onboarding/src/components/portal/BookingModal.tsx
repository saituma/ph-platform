import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, MapPin, Video, Info, Lock, Users, Check, Clock } from "lucide-react";
import {
  fetchBookingServices,
  createBooking,
  fetchGeneratedAvailability,
} from "@/services/scheduleService";
import { toast } from "sonner";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess: () => void;
}

interface OccurrenceSlot {
  serviceTypeId: number;
  occurrenceKey: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  remainingCapacity: number | null;
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function BookingModal({ isOpen, onClose, token, onSuccess }: BookingModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<OccurrenceSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [occurrences, setOccurrences] = useState<OccurrenceSlot[]>([]);
  const [occurrencesLoading, setOccurrencesLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      setConfirmed(false);
      setNotes("");
      setSelectedServiceId(null);
      setSelectedOccurrence(null);
      setOccurrences([]);
      loadServices();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen || !token || !selectedServiceId) {
      setOccurrences([]);
      setSelectedOccurrence(null);
      return;
    }
    const svc = services.find((s) => s.id === selectedServiceId);
    if (!svc || svc.schedulePattern !== "weekly_recurring") {
      setOccurrences([]);
      return;
    }

    let cancelled = false;
    setOccurrencesLoading(true);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 30);

    (async () => {
      try {
        const items = await fetchGeneratedAvailability(token, { from, to, serviceTypeId: selectedServiceId });
        if (cancelled) return;
        const now = Date.now();
        const available = items
          .filter((o: any) => o.serviceTypeId === selectedServiceId)
          .filter((o: any) => new Date(o.startsAt).getTime() > now)
          .filter((o: any) => o.remainingCapacity == null || o.remainingCapacity > 0)
          .map((o: any) => ({
            serviceTypeId: o.serviceTypeId,
            occurrenceKey: o.occurrenceKey,
            startsAt: o.startsAt,
            endsAt: o.endsAt,
            capacity: o.capacity,
            remainingCapacity: o.remainingCapacity,
          }));
        setOccurrences(available);
      } catch {
        if (!cancelled) setOccurrences([]);
      } finally {
        if (!cancelled) setOccurrencesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, token, selectedServiceId, services]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await fetchBookingServices(token!);
      const active = data.filter((s: any) => s.isActive !== false);
      setServices(active);
      if (active.length > 0) setSelectedServiceId(active[0].id);
    } catch {
      toast.error("Failed to load booking services");
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const isRecurring = selectedService?.schedulePattern === "weekly_recurring";

  const isBookingSlotsFull =
    selectedService?.totalSlots != null &&
    selectedService?.remainingTotalSlots != null &&
    selectedService.remainingTotalSlots <= 0;

  const isCapFull =
    selectedService?.capacity != null &&
    selectedService?.remainingCapacity != null &&
    selectedService.remainingCapacity <= 0;

  const canSubmit =
    !!selectedService &&
    !selectedService.isLocked &&
    !isBookingSlotsFull &&
    !isCapFull &&
    (!isRecurring || !!selectedOccurrence);

  const handleSubmit = async () => {
    if (!token || !selectedService || submitting || !canSubmit) return;

    setSubmitting(true);
    try {
      let startsAt: Date;
      let endsAt: Date;
      let occurrenceKey: string | undefined;

      if (selectedOccurrence) {
        startsAt = new Date(selectedOccurrence.startsAt);
        endsAt = new Date(selectedOccurrence.endsAt);
        occurrenceKey = selectedOccurrence.occurrenceKey;
      } else if (selectedService.oneTimeDate) {
        startsAt = new Date(`${selectedService.oneTimeDate}T${selectedService.oneTimeTime || "09:00:00"}`);
        endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
      } else {
        startsAt = new Date();
        startsAt.setDate(startsAt.getDate() + 1);
        startsAt.setHours(12, 0, 0, 0);
        endsAt = new Date(startsAt.getTime() + selectedService.durationMinutes * 60000);
      }

      await createBooking(token, {
        serviceTypeId: selectedService.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        timezoneOffsetMinutes: startsAt.getTimezoneOffset(),
        notes: notes.trim() || undefined,
        occurrenceKey,
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

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
                  Your request has been sent. You'll receive an email notification once your session is confirmed.
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
                Choose a session type and time slot. Our coaches will review and confirm your booking.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* ── Service type pills ── */}
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setSelectedOccurrence(null);
                        }}
                        disabled={service.isLocked}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
                          selectedServiceId === service.id
                            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-muted border-transparent text-muted-foreground hover:border-border"
                        } ${service.isLocked ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
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

                  {/* ── Capacity info ── */}
                  {selectedService && (() => {
                    const total = selectedService.totalSlots;
                    const remT = selectedService.remainingTotalSlots;
                    if (total != null && remT != null) {
                      const full = remT <= 0;
                      return (
                        <div className={`p-4 rounded-2xl border flex gap-3 ${
                          full ? "bg-destructive/10 border-destructive/30" : "bg-primary/5 border-primary/20"
                        }`}>
                          <Users className="w-5 h-5 shrink-0 opacity-70 mt-0.5" />
                          <p className={`text-xs leading-relaxed ${full ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                            {full
                              ? "No booking slots left for this service."
                              : `${remT} of ${total} booking slot${total === 1 ? "" : "s"} left`}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* ── Slot picker (recurring services) ── */}
                  {selectedService && isRecurring && !selectedService.isLocked ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary/60" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Pick a time slot
                        </span>
                      </div>

                      {occurrencesLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground ml-2">Loading slots...</span>
                        </div>
                      ) : occurrences.length === 0 ? (
                        <div className="p-4 bg-muted/30 rounded-2xl border border-dashed border-border">
                          <p className="text-xs text-muted-foreground">
                            No available slots in the next 30 days. You can still send a general request.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {occurrences.map((occ) => {
                            const isSelected = selectedOccurrence?.occurrenceKey === occ.occurrenceKey;
                            const spots = occ.remainingCapacity;
                            return (
                              <button
                                key={occ.occurrenceKey}
                                onClick={() => setSelectedOccurrence(occ)}
                                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-semibold">{formatSlotDate(occ.startsAt)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatSlotTime(occ.startsAt)} – {formatSlotTime(occ.endsAt)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {spots != null && (
                                      <span className={`text-[10px] font-bold uppercase ${
                                        spots <= 1 ? "text-destructive" : "text-primary"
                                      }`}>
                                        {spots} spot{spots === 1 ? "" : "s"}
                                      </span>
                                    )}
                                    {isSelected && (
                                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* ── One-time date ── */}
                  {selectedService?.oneTimeDate ? (
                    <div className="p-4 rounded-2xl border border-primary bg-primary/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Scheduled for</p>
                      <p className="text-sm font-semibold mt-1">
                        {new Date(`${selectedService.oneTimeDate}T12:00:00`).toLocaleDateString([], {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {selectedService.oneTimeTime}
                      </p>
                    </div>
                  ) : null}

                  {/* ── Location & link ── */}
                  <div className="p-4 bg-card border rounded-2xl space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Location & Details
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary/60" />
                        <span className="font-medium">
                          {selectedService?.defaultLocation || "TBD (Coach will confirm)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Video className="w-4 h-4 text-primary/60" />
                        <span className="font-medium text-primary underline truncate max-w-[200px]">
                          {selectedService?.defaultMeetingLink || "Link will be shared on confirmation"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Notes ── */}
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

                  {/* ── Submit ── */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !canSubmit}
                    className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-wider shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {submitting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isRecurring && !selectedOccurrence ? (
                      "Pick a slot"
                    ) : (
                      "Send Request"
                    )}
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
