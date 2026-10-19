import express from "express";

import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";


const router =
  express.Router();


router.use(
  authenticateToken
);


router.get(
  "/mine",
  getMyNotifications
);


router.patch(
  "/read-all",
  markAllNotificationsRead
);


router.patch(
  "/:notificationId/read",
  markNotificationRead
);


export default router;