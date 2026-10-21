import express from "express";

import {
  getMyAppointments,
  getMyAppointmentById,
} from "../controllers/appointment.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  requireRole,
} from "../middleware/role.middleware";

import {
  UserRole,
} from "@prisma/client";


const router =
  express.Router();


router.use(
  authenticateToken
);

router.use(
  requireRole(
    UserRole.USER
  )
);


router.get(
  "/mine",
  getMyAppointments
);


router.get(
  "/:appointmentId",
  getMyAppointmentById
);


export default router;