import express from "express";

import {
  getMyPractitionerProfile,
  getPractitionerEnquiries,
  getPractitionerEnquiryById,
  acceptEnquiry,
  proposeSessionTime,
  acceptUserProposal,
  declineUserProposal,
  declineEnquiry,
  getPractitionerAppointments,
  getPractitionerAppointmentById,
} from "../controllers/practitioner.controller";

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
    UserRole.PRACTITIONER
  )
);


// ======================================================
// OWN PRACTITIONER PROFILE
// ======================================================

router.get(
  "/profile",
  getMyPractitionerProfile
);


// ======================================================
// ENQUIRIES
// ======================================================

router.get(
  "/enquiries",
  getPractitionerEnquiries
);


router.get(
  "/enquiries/:enquiryId",
  getPractitionerEnquiryById
);


// Accept user's ORIGINAL requested time

router.post(
  "/enquiries/:enquiryId/accept",
  acceptEnquiry
);


// Practitioner proposes another time

router.post(
  "/enquiries/:enquiryId/proposals",
  proposeSessionTime
);


// Practitioner accepts USER counter-proposal

router.post(
  "/enquiries/:enquiryId/proposals/:proposalId/accept",
  acceptUserProposal
);


// Practitioner declines USER counter-proposal

router.post(
  "/enquiries/:enquiryId/proposals/:proposalId/decline",
  declineUserProposal
);


// Practitioner declines whole enquiry

router.post(
  "/enquiries/:enquiryId/decline",
  declineEnquiry
);


// ======================================================
// APPOINTMENTS
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