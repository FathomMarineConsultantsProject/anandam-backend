import express from "express";

import {
  getPractitionerEnquiries,
  getPractitionerEnquiryById,
  proposeSessionTime,
  declineEnquiry,
  getPractitionerAppointments,
  getPractitionerAppointmentById,
} from "../controllers/practitioner.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

const router =
  express.Router();

router.use(
  authenticateToken
);


// ======================================================
// PRACTITIONER ENQUIRIES
// ======================================================

router.get(
  "/enquiries",
  getPractitionerEnquiries
);

router.get(
  "/enquiries/:enquiryId",
  getPractitionerEnquiryById
);

router.post(
  "/enquiries/:enquiryId/proposals",
  proposeSessionTime
);

router.post(
  "/enquiries/:enquiryId/decline",
  declineEnquiry
);


// ======================================================
// PRACTITIONER APPOINTMENTS
// ======================================================

router.get(
  "/appointments",
  getPractitionerAppointments
);

router.get(
  "/appointments/:appointmentId",
  getPractitionerAppointmentById
);

export default router;