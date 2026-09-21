import { Router } from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  getGoogleCalendarStatus,
  getGoogleCalendarConnectUrl,
  googleCalendarCallback,
  disconnectGoogleCalendar,
  retryGoogleCalendarSync,
} from "../controllers/googleCalendar.controller";


const router =
  Router();


router.get(
  "/status",
  authenticateToken,
  getGoogleCalendarStatus
);


router.get(
  "/connect-url",
  authenticateToken,
  getGoogleCalendarConnectUrl
);


// NO authenticateToken here.
// Google redirects directly to this URL.
router.get(
  "/callback",
  googleCalendarCallback
);


router.post(
  "/disconnect",
  authenticateToken,
  disconnectGoogleCalendar
);


router.post(
  "/sync/:activityId",
  authenticateToken,
  retryGoogleCalendarSync
);


export default router;