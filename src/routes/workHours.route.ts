import { Router } from "express";
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
  getMonthlyWorkRestCompliance,
} from "../controllers/workHours.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/day/:date", authenticateToken, getMyWorkDay);
router.patch("/day/:date/slots", authenticateToken, updateMyDaySlots);
router.delete("/day/:date/slots/:slotIndex", authenticateToken, deleteMyDaySlot);
router.patch("/day/:date/comment", authenticateToken, updateDayComment);
router.delete("/day/:date/comment", authenticateToken, deleteDayComment);

router.get("/sessions/active", authenticateToken, getActiveSession);
router.post("/sessions/clock-in", authenticateToken, clockIn);
router.post("/sessions/clock-out", authenticateToken, clockOut);
router.post("/sessions/manual", authenticateToken, createManualWorkSession);
router.patch("/sessions/:sessionId", authenticateToken, updateWorkSession);
router.delete("/sessions/:sessionId", authenticateToken, deleteWorkSession);

router.get("/summary/:date", authenticateToken, getDailySummary);
router.get("/history", authenticateToken, getMyWorkRestHistory);
router.get("/compliance/month/:month", authenticateToken, getMonthlyWorkRestCompliance);

export default router;
