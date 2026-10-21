import express from "express";

import {
  createEnquiry,
  getMyEnquiries,
  getMyEnquiryById,
  acceptProposal,
  proposeAnotherTime,
  declineProposal,
} from "../controllers/enquiry.controller";

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


// Create enquiry

router.post(
  "/",
  createEnquiry
);


// User's enquiries

router.get(
  "/mine",
  getMyEnquiries
);


router.get(
  "/:enquiryId",
  getMyEnquiryById
);


// Accept practitioner proposal

router.post(
  "/:enquiryId/proposals/:proposalId/accept",
  acceptProposal
);


// Counter practitioner proposal
// Keeps compatibility with the FE route we already started.

router.post(
  "/:enquiryId/proposals/:proposalId/reschedule",
  proposeAnotherTime
);


// Start reschedule from an already-confirmed appointment.

router.post(
  "/:enquiryId/reschedule",
  proposeAnotherTime
);


// Decline practitioner proposal

router.post(
  "/:enquiryId/proposals/:proposalId/decline",
  declineProposal
);


export default router;