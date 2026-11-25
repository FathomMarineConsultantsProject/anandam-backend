"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workHours_controller_1 = require("../controllers/workHours.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ======================================================
// SELECTED DAY
// ======================================================
router.get("/day/:date", auth_middleware_1.authenticateToken, workHours_controller_1.getMyWorkDay);
// Existing REST / MEAL update
router.patch("/day/:date/slots", auth_middleware_1.authenticateToken, workHours_controller_1.updateMyDaySlots);
// Delete one REST / MEAL slot
router.delete("/day/:date/slots/:slotIndex", auth_middleware_1.authenticateToken, workHours_controller_1.deleteMyDaySlot);
// ======================================================
// COMMENT OF THE DAY
// ======================================================
router.patch("/day/:date/comment", auth_middleware_1.authenticateToken, workHours_controller_1.updateDayComment);
router.delete("/day/:date/comment", auth_middleware_1.authenticateToken, workHours_controller_1.deleteDayComment);
// ======================================================
// WORK SESSIONS
// ======================================================
router.get("/sessions/active", auth_middleware_1.authenticateToken, workHours_controller_1.getActiveSession);
router.post("/sessions/clock-in", auth_middleware_1.authenticateToken, workHours_controller_1.clockIn);
router.post("/sessions/clock-out", auth_middleware_1.authenticateToken, workHours_controller_1.clockOut);
router.post("/sessions/manual", auth_middleware_1.authenticateToken, workHours_controller_1.createManualWorkSession);
// Edit existing completed work
router.patch("/sessions/:sessionId", auth_middleware_1.authenticateToken, workHours_controller_1.updateWorkSession);
// Delete existing completed work
router.delete("/sessions/:sessionId", auth_middleware_1.authenticateToken, workHours_controller_1.deleteWorkSession);
// ======================================================
// SUMMARY / HISTORY
// ======================================================
router.get("/summary/:date", auth_middleware_1.authenticateToken, workHours_controller_1.getDailySummary);
router.get("/history", auth_middleware_1.authenticateToken, workHours_controller_1.getMyWorkRestHistory);
exports.default = router;
