import {
  Router,
} from "express";

import {
  createMoodLog,
  getMyMoodHistory,
  getMoodLogById,
} from "../controllers/mood.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  allowQuickMoodCheckinOrSiteAccess,
  allowQuickMoodHistoryOrSiteAccess,
  requireSiteAccess,
} from "../middleware/siteAccess.middleware";


const router =
  Router();


// QUICK is free; FULL requires site access.
router.post(
  "/log",
  authenticateToken,
  allowQuickMoodCheckinOrSiteAccess,
  createMoodLog
);


// QUICK history is free; full/all history requires access.
router.get(
  "/history",
  authenticateToken,
  allowQuickMoodHistoryOrSiteAccess,
  getMyMoodHistory
);


// Individual mood details belong to the full Mood feature.
router.get(
  "/:id",
  authenticateToken,
  requireSiteAccess,
  getMoodLogById
);


export default router;
