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


// ======================================================
// CREATE MOOD CHECK-IN
//
// QUICK:
// Free.
//
// FULL:
// Requires active Anandam access.
// ======================================================

router.post(
  "/log",

  authenticateToken,

  allowQuickMoodCheckinOrSiteAccess,

  createMoodLog
);


// ======================================================
// MOOD HISTORY
//
// ?type=QUICK
// Free.
//
// FULL / no type:
// Requires active Anandam access.
// ======================================================

router.get(
  "/history",

  authenticateToken,

  allowQuickMoodHistoryOrSiteAccess,

  getMyMoodHistory
);


// ======================================================
// INDIVIDUAL MOOD RECORD
//
// Protected because this belongs to the complete
// Mood feature.
// ======================================================

router.get(
  "/:id",

  authenticateToken,

  requireSiteAccess,

  getMoodLogById
);


export default router;