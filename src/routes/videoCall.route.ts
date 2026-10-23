import express from "express";

import {
  createVideoCallToken,
  endVideoCall,
  getVideoCallStatus,
  markVideoCallConnected,
} from "../controllers/videoCall.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";


const router =
  express.Router();


/*
  Do NOT add requireRole(USER) here.

  Both:
  - USER
  - PRACTITIONER

  are allowed.

  Authorization is checked against
  the Appointment itself.
*/

router.use(
  authenticateToken
);


// ======================================================
// GET CALL STATUS
// ======================================================

router.get(
  "/appointments/:appointmentId/status",
  getVideoCallStatus
);


// ======================================================
// GET JOIN TOKEN
// ======================================================

router.post(
  "/appointments/:appointmentId/token",
  createVideoCallToken
);

// ======================================================
// MARK ACTUAL LIVEKIT CONNECTION
// ======================================================

router.post(
  "/appointments/:appointmentId/connected",
  markVideoCallConnected
);

// ======================================================
// END SESSION
// ======================================================

router.post(
  "/appointments/:appointmentId/end",
  endVideoCall
);


export default router;