import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { searchGiphy } from "../controllers/giphy.controller";

const router = Router();

router.get("/giphy/search", requireAuth, searchGiphy);

export default router;
