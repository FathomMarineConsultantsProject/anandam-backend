"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const googleCalendar_controller_1 = require("../controllers/googleCalendar.controller");
const router = (0, express_1.Router)();
router.get("/status", auth_middleware_1.authenticateToken, googleCalendar_controller_1.getGoogleCalendarStatus);
router.get("/connect-url", auth_middleware_1.authenticateToken, googleCalendar_controller_1.getGoogleCalendarConnectUrl);
// NO authenticateToken here.
// Google redirects directly to this URL.
router.get("/callback", googleCalendar_controller_1.googleCalendarCallback);
router.post("/disconnect", auth_middleware_1.authenticateToken, googleCalendar_controller_1.disconnectGoogleCalendar);
router.post("/sync/:activityId", auth_middleware_1.authenticateToken, googleCalendar_controller_1.retryGoogleCalendarSync);
exports.default = router;
