import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
import { requireRole } from "../middlewares/roles";
import { rateLimiters } from "../lib/rateLimiter";
import {
  bookingAction,
  bookingActionPost,
  cancelBooking,
  createAvailability,
  createBookingForUser,
  createService,
  deleteService,
  listGeneratedAvailabilityForUser,
  listAvailability,
  listBookings,
  listServices,
  updateService,
} from "../controllers/booking.controller";

const router = Router();

router.get("/public/booking-action", bookingAction);
router.post("/public/booking-action", rateLimiters.auth, bookingActionPost);
router.get("/bookings/services", requireAuth, requireFeature("bookings"), listServices);
router.post("/bookings/services", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createService);
router.patch("/bookings/services/:id", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateService);
router.delete("/bookings/services/:id", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteService);
router.get("/bookings/availability", requireAuth, requireFeature("bookings"), listAvailability);
router.get("/bookings/generated-availability", requireAuth, requireFeature("bookings"), listGeneratedAvailabilityForUser);
router.post("/bookings/availability", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createAvailability);
router.post("/bookings", requireAuth, requireFeature("bookings"), createBookingForUser);
router.get("/bookings", requireAuth, requireFeature("bookings"), listBookings);
router.delete("/bookings/:id", requireAuth, requireFeature("bookings"), cancelBooking);

export default router;
