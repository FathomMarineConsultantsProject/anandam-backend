"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const videoCall_controller_1 = require("../controllers/videoCall.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
/*
  Do NOT add requireRole(USER) here.

  Both:
  - USER
  - PRACTITIONER

  are allowed.

  Authorization is checked against
  the Appointment itself.
*/
router.use(auth_middleware_1.authenticateToken);
// ======================================================
// GET CALL STATUS
// ======================================================
router.get("/appointments/:appointmentId/status", videoCall_controller_1.getVideoCallStatus);
// ======================================================
// GET JOIN TOKEN
// ======================================================
router.post("/appointments/:appointmentId/token", videoCall_controller_1.createVideoCallToken);
// ======================================================
// MARK ACTUAL LIVEKIT CONNECTION
// ======================================================
router.post("/appointments/:appointmentId/connected", videoCall_controller_1.markVideoCallConnected);
// ======================================================
// END SESSION
// ======================================================
router.post("/appointments/:appointmentId/end", videoCall_controller_1.endVideoCall);
exports.default = router;
