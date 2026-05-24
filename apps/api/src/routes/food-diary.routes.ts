import { Router } from "express";

import { requireAuth } from "../middlewares/auth";
import { requireFeature } from "../middlewares/feature";
import { createFoodDiary, listFoodDiary } from "../controllers/food-diary.controller";

const router = Router();

router.get("/food-diary", requireAuth, requireFeature("food_diaries"), listFoodDiary);
router.post("/food-diary", requireAuth, requireFeature("submit_diary"), createFoodDiary);

export default router;
