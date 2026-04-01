import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/roles";
import {
  bookingAction,
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
router.get("/bookings/services", requireAuth, listServices);
router.post("/bookings/services", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createService);
router.patch("/bookings/services/:id", requireAuth, requireRole(["coach", "admin", "superAdmin"]), updateService);
router.delete("/bookings/services/:id", requireAuth, requireRole(["coach", "admin", "superAdmin"]), deleteService);
router.get("/bookings/availability", requireAuth, listAvailability);
router.get("/bookings/generated-availability", requireAuth, listGeneratedAvailabilityForUser);
router.post("/bookings/availability", requireAuth, requireRole(["coach", "admin", "superAdmin"]), createAvailability);
router.post("/bookings", requireAuth, createBookingForUser);
router.get("/bookings", requireAuth, listBookings);

export default router;
