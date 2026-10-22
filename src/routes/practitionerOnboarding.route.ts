import express from "express";

import {
  UserRole,
} from "@prisma/client";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  requireRole,
} from "../middleware/role.middleware";

import {
  getPractitionerOnboarding,
  savePractitionerBasicDetails,
  savePractitionerProfessionalDetails,
  savePractitionerOnlinePresence,
  selectPractitionerAvatar,
  createPractitionerUploadUrl,
  confirmPractitionerUpload,
  getPractitionerDocumentDownloadUrl,
  deletePractitionerDocument,
  submitPractitionerOnboarding,
} from "../controllers/practitionerOnboarding.controller";


const router =
  express.Router();


// ======================================================
// AUTHENTICATION + PRACTITIONER ROLE
// ======================================================

router.use(
  authenticateToken
);

router.use(
  requireRole(
    UserRole.PRACTITIONER
  )
);


// ======================================================
// GET COMPLETE ONBOARDING / EDITABLE PROFILE
// ======================================================

router.get(
  "/",
  getPractitionerOnboarding
);


// ======================================================
// STEP 1 - BASIC DETAILS
// ======================================================

router.patch(
  "/basic",
  savePractitionerBasicDetails
);


// ======================================================
// STEP 2 - PROFESSIONAL DETAILS
// ======================================================

router.patch(
  "/professional",
  savePractitionerProfessionalDetails
);


// ======================================================
// STEP 3 - ONLINE PRESENCE
// ======================================================

router.patch(
  "/online-presence",
  savePractitionerOnlinePresence
);


// ======================================================
// AVATAR
//
// INITIALS
// AVATAR
//
// PHOTO is automatically selected after
// successful profile-picture upload.
// ======================================================

router.patch(
  "/avatar",
  selectPractitionerAvatar
);


// ======================================================
// FILE UPLOADS
//
// PROFILE_IMAGE <= 4.5 MB
// DOCUMENT      <= 4.5 MB
// ======================================================

router.post(
  "/uploads/presign",
  createPractitionerUploadUrl
);


router.post(
  "/uploads/confirm",
  confirmPractitionerUpload
);


// ======================================================
// PRACTITIONER DOCUMENTS
// ======================================================

router.get(
  "/documents/:documentId/download-url",
  getPractitionerDocumentDownloadUrl
);


router.delete(
  "/documents/:documentId",
  deletePractitionerDocument
);


// ======================================================
// STEP 4 - REVIEW & SUBMIT
// ======================================================

router.post(
  "/submit",
  submitPractitionerOnboarding
);


export default router;