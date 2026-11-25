"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Update an existing profile (PATCH /api/profile)
router.patch('/', auth_middleware_1.authenticateToken, profile_controller_1.updateProfile);
// Get user profile detail
router.get('/', auth_middleware_1.authenticateToken, profile_controller_1.getMyProfile);
exports.default = router;
