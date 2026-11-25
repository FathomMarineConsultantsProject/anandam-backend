"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const practitioner_controller_1 = require("../controllers/practitioner.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.PRACTITIONER));
// ======================================================
// OWN PRACTITIONER PROFILE
// ======================================================
router.get("/profile", practitioner_controller_1.getMyPractitionerProfile);
// ======================================================
// ENQUIRIES
// ======================================================
router.get("/enquiries", practitioner_controller_1.getPractitionerEnquiries);
router.get("/enquiries/:enquiryId", practitioner_controller_1.getPractitionerEnquiryById);
// Accept user's ORIGINAL requested time
router.post("/enquiries/:enquiryId/accept", practitioner_controller_1.acceptEnquiry);
// Practitioner proposes another time
router.post("/enquiries/:enquiryId/proposals", practitioner_controller_1.proposeSessionTime);
// Practitioner accepts USER counter-proposal
router.post("/enquiries/:enquiryId/proposals/:proposalId/accept", practitioner_controller_1.acceptUserProposal);
// Practitioner declines USER counter-proposal
router.post("/enquiries/:enquiryId/proposals/:proposalId/decline", practitioner_controller_1.declineUserProposal);
// Practitioner declines whole enquiry
router.post("/enquiries/:enquiryId/decline", practitioner_controller_1.declineEnquiry);
// ======================================================
// APPOINTMENTS
// ======================================================
router.get("/appointments", practitioner_controller_1.getPractitionerAppointments);
router.get("/appointments/:appointmentId", practitioner_controller_1.getPractitionerAppointmentById);
exports.default = router;
