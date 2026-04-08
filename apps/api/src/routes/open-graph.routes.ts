import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { getOpenGraph } from "../controllers/open-graph.controller";

const router = Router();

router.get("/open-graph", requireAuth, getOpenGraph);

export default router;
