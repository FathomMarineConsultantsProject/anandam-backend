import { Router } from "express";
import { listPublishedResorts, getPublishedResort } from "../controllers/resortPublic.controller";
const router = Router();
router.get("/", listPublishedResorts);
router.get("/:slug", getPublishedResort);
export default router;
