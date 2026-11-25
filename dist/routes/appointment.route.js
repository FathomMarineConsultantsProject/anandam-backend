"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const appointment_controller_1 = require("../controllers/appointment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.USER));
router.get("/mine", appointment_controller_1.getMyAppointments);
router.get("/:appointmentId", appointment_controller_1.getMyAppointmentById);
exports.default = router;
