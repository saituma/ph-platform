import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { blockUser } from "../controllers/users.controller";

const router = Router();

router.post("/users/:userId/block", requireAuth, blockUser);

export default router;
