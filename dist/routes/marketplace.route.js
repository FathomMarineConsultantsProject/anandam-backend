"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketplace_controller_1 = require("../controllers/marketplace.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
router.use((0, role_middleware_1.requireRole)(client_1.UserRole.USER));
router.get("/practitioners", marketplace_controller_1.getPractitioners);
router.get("/practitioners/:slug", marketplace_controller_1.getPractitionerBySlug);
router.get("/specialties", marketplace_controller_1.getSpecialties);
exports.default = router;
