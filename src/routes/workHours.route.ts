import {
  Router,
} from "express";

import {
  getMyWorkDay,
  updateMyDaySlots,
  deleteMyDaySlot,

  updateDayComment,
  deleteDayComment,

  clockIn,
  clockOut,
  getActiveSession,
  createManualWorkSession,

  updateWorkSession,
  deleteWorkSession,

  getDailySummary,
  getMyWorkRestHistory,
} from "../controllers/workHours.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";


const router =
  Router();


// ======================================================
// SELECTED DAY
// ======================================================

router.get(
  "/day/:date",
  authenticateToken,
  getMyWorkDay
);


// Existing REST / MEAL update
router.patch(
  "/day/:date/slots",
  authenticateToken,
  updateMyDaySlots
);


// Delete one REST / MEAL slot
router.delete(
  "/day/:date/slots/:slotIndex",
  authenticateToken,
  deleteMyDaySlot
);


// ======================================================
// COMMENT OF THE DAY
// ======================================================

router.patch(
  "/day/:date/comment",
  authenticateToken,
  updateDayComment
);


router.delete(
  "/day/:date/comment",
  authenticateToken,
  deleteDayComment
);


// ======================================================
// WORK SESSIONS
// ======================================================

router.get(
  "/sessions/active",
  authenticateToken,
  getActiveSession
);


router.post(
  "/sessions/clock-in",
  authenticateToken,
  clockIn
);


router.post(
  "/sessions/clock-out",
  authenticateToken,
  clockOut
);


router.post(
  "/sessions/manual",
  authenticateToken,
  createManualWorkSession
);


// Edit existing completed work
router.patch(
  "/sessions/:sessionId",
  authenticateToken,
  updateWorkSession
);


// Delete existing completed work
router.delete(
  "/sessions/:sessionId",
  authenticateToken,
  deleteWorkSession
);


// ======================================================
// SUMMARY / HISTORY
// ======================================================

router.get(
  "/summary/:date",
  authenticateToken,
  getDailySummary
);


router.get(
  "/history",
  authenticateToken,
  getMyWorkRestHistory
);


export default router;