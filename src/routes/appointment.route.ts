import express from "express";

import {
  getMyAppointments,
} from "../controllers/appointment.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

const router = express.Router();

router.use(authenticateToken);

router.get(
  "/mine",
  getMyAppointments
);

export default router;