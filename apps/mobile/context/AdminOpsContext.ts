/**
 * Cross-tab requests for Admin Ops.
 *
 * PagerView breaks React Context propagation, so we use a module-level
 * emitter just like ActiveTabContext.
 */

export type AdminOpsSection = "bookings" | "availability" | "services" | "teams";
export type AdminOpsAction =
  | "createBooking"
  | "createAvailability"
  | "createService"
  | "createTeam";

type RequestPayload = {
  /**
   * Preferred routing target for Admin Ops (new UI).
   * Kept optional to preserve legacy callers that send `section`.
   */
  destination?: "hub" | "schedule" | "nutrition" | "referrals";
  section?: AdminOpsSection;
  action?: AdminOpsAction;
};

type Listener = (payload: RequestPayload) => void;

const _listeners = new Set<Listener>();

export function requestAdminOps(payload: RequestPayload) {
  _listeners.forEach((fn) => fn(payload));
}

export function subscribeToAdminOpsRequests(listener: Listener) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}
