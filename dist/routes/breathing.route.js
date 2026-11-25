"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const breathing_controller_1 = require("../controllers/breathing.controller");
const router = (0, express_1.Router)();
router.get("/tracks", auth_middleware_1.authenticateToken, breathing_controller_1.getBreathingTracks);
exports.default = router;
