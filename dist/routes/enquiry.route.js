"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const enquiry_controller_1 = require("../controllers/enquiry.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.USER));
// Create enquiry
router.post("/", enquiry_controller_1.createEnquiry);
// User's enquiries
router.get("/mine", enquiry_controller_1.getMyEnquiries);
router.get("/:enquiryId", enquiry_controller_1.getMyEnquiryById);
// Accept practitioner proposal
router.post("/:enquiryId/proposals/:proposalId/accept", enquiry_controller_1.acceptProposal);
// Counter practitioner proposal
// Keeps compatibility with the FE route we already started.
router.post("/:enquiryId/proposals/:proposalId/reschedule", enquiry_controller_1.proposeAnotherTime);
// Start reschedule from an already-confirmed appointment.
router.post("/:enquiryId/reschedule", enquiry_controller_1.proposeAnotherTime);
// Decline practitioner proposal
router.post("/:enquiryId/proposals/:proposalId/decline", enquiry_controller_1.declineProposal);
exports.default = router;
