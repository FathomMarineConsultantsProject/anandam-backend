"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const practitionerOnboarding_controller_1 = require("../controllers/practitionerOnboarding.controller");
const router = express_1.default.Router();
// ======================================================
// AUTHENTICATION + PRACTITIONER ROLE
// ======================================================
router.use(auth_middleware_1.authenticateToken);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.PRACTITIONER));
// ======================================================
// GET COMPLETE ONBOARDING / EDITABLE PROFILE
// ======================================================
router.get("/", practitionerOnboarding_controller_1.getPractitionerOnboarding);
// ======================================================
// STEP 1 - BASIC DETAILS
// ======================================================
router.patch("/basic", practitionerOnboarding_controller_1.savePractitionerBasicDetails);
// ======================================================
// STEP 2 - PROFESSIONAL DETAILS
// ======================================================
router.patch("/professional", practitionerOnboarding_controller_1.savePractitionerProfessionalDetails);
// ======================================================
// STEP 3 - ONLINE PRESENCE
// ======================================================
router.patch("/online-presence", practitionerOnboarding_controller_1.savePractitionerOnlinePresence);
// ======================================================
// AVATAR
//
// INITIALS
// AVATAR
//
// PHOTO is automatically selected after
// successful profile-picture upload.
// ======================================================
router.patch("/avatar", practitionerOnboarding_controller_1.selectPractitionerAvatar);
// ======================================================
// FILE UPLOADS
//
// PROFILE_IMAGE <= 4.5 MB
// DOCUMENT      <= 4.5 MB
// ======================================================
router.post("/uploads/presign", practitionerOnboarding_controller_1.createPractitionerUploadUrl);
router.post("/uploads/confirm", practitionerOnboarding_controller_1.confirmPractitionerUpload);
// ======================================================
// PRACTITIONER DOCUMENTS
// ======================================================
router.get("/documents/:documentId/download-url", practitionerOnboarding_controller_1.getPractitionerDocumentDownloadUrl);
router.delete("/documents/:documentId", practitionerOnboarding_controller_1.deletePractitionerDocument);
// ======================================================
// STEP 4 - REVIEW & SUBMIT
// ======================================================
router.post("/submit", practitionerOnboarding_controller_1.submitPractitionerOnboarding);
router.get("/specialties", practitionerOnboarding_controller_1.getPractitionerOnboardingSpecialties);
exports.default = router;
