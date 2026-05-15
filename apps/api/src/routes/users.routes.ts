import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { blockUser, reportUser } from "../controllers/users.controller";

const router = Router();

router.post("/users/:userId/block", requireAuth, blockUser);
router.post("/users/:userId/report", requireAuth, reportUser);

export default router;
