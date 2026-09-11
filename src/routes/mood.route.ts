import { Router } from "express";

import {
  createMoodLog,
  getMyMoodHistory,
  getMoodLogById,
} from "../controllers/mood.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/log",
  authenticateToken,
  createMoodLog
);

router.get(
  "/history",
  authenticateToken,
  getMyMoodHistory
);

router.get(
  "/:id",
  authenticateToken,
  getMoodLogById
);

export default router;