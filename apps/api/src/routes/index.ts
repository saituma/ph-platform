import { Router } from "express";

import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import onboardingRoutes from "./onboarding.routes";
import programRoutes from "./program.routes";
import contentRoutes from "./content.routes";
import messageRoutes from "./message.routes";
import chatRoutes from "./chat.routes";
import bookingRoutes from "./booking.routes";
import videoRoutes from "./video.routes";
import adminRoutes from "./admin.routes";
import mediaRoutes from "./media.routes";
import billingRoutes from "./billing.routes";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(onboardingRoutes);
router.use(programRoutes);
router.use(contentRoutes);
router.use(messageRoutes);
router.use(chatRoutes);
router.use(bookingRoutes);
router.use(videoRoutes);
router.use(mediaRoutes);
router.use(adminRoutes);
router.use(billingRoutes);

export default router;
