import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, MapPin, Video, Info, Lock } from "lucide-react";
import { fetchBookingServices, createBooking } from "@/services/scheduleService";
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

  useEffect(() => {
    if (isOpen && token) {
      setConfirmed(false);
      setNotes("");
      loadServices();
    }
  }, [isOpen, token]);

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

  const handleSubmit = async () => {
    if (!token || !selectedService || submitting) return;
    
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
                    disabled={submitting || !selectedServiceId}
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
