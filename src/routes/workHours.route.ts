import { Router } from "express";

import {
  getMyWorkDay,
  updateMyDaySlots,

  clockIn,
  clockOut,
  getActiveSession,

  createManualWorkSession,

  getDailySummary,
  getMyWorkRestHistory,
} from "../controllers/workHours.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

const router = Router();


// Selected day
router.get(
  "/day/:date",
  authenticateToken,
  getMyWorkDay
);


// Change Rest / Meal / Unrecorded
router.patch(
  "/day/:date/slots",
  authenticateToken,
  updateMyDaySlots
);


// Current active work session
router.get(
  "/sessions/active",
  authenticateToken,
  getActiveSession
);


// Live clock in
router.post(
  "/sessions/clock-in",
  authenticateToken,
  clockIn
);


// Live clock out
router.post(
  "/sessions/clock-out",
  authenticateToken,
  clockOut
);


// Missed / historical work entry
router.post(
  "/sessions/manual",
  authenticateToken,
  createManualWorkSession
);


// Daily cards / MLC summary
router.get(
  "/summary/:date",
  authenticateToken,
  getDailySummary
);


// Work/rest history
router.get(
  "/history",
  authenticateToken,
  getMyWorkRestHistory
);


export default router;