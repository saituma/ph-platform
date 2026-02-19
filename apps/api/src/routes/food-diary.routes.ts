import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { createFoodDiary, listFoodDiary } from "../controllers/food-diary.controller";

const router = Router();

router.get("/food-diary", requireAuth, listFoodDiary);
router.post("/food-diary", requireAuth, createFoodDiary);

export default router;
