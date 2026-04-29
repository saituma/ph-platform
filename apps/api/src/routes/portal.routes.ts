import { Router } from "express";
import { getPublicPortalConfig } from "../controllers/admin/portal-config.controller";

const router = Router();

router.get("/portal-config", getPublicPortalConfig);

export default router;
