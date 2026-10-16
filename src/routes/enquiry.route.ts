import express from "express";

import {
  createEnquiry,
  getMyEnquiries,
  getMyEnquiryById,
  acceptProposal,
  requestAnotherTime,
  declineProposal,
} from "../controllers/enquiry.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

const router =
  express.Router();

router.use(
  authenticateToken
);


// ======================================================
// USER ENQUIRIES
// ======================================================

router.post(
  "/",
  createEnquiry
);

router.get(
  "/mine",
  getMyEnquiries
);

router.get(
  "/:enquiryId",
  getMyEnquiryById
);


// ======================================================
// USER RESPONSE TO PROPOSAL
// ======================================================

router.post(
  "/:enquiryId/proposals/:proposalId/accept",
  acceptProposal
);

router.post(
  "/:enquiryId/proposals/:proposalId/request-another-time",
  requestAnotherTime
);

router.post(
  "/:enquiryId/proposals/:proposalId/decline",
  declineProposal
);

export default router;