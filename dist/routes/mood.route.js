"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mood_controller_1 = require("../controllers/mood.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const siteAccess_middleware_1 = require("../middleware/siteAccess.middleware");
const router = (0, express_1.Router)();
// QUICK is free; FULL requires site access.
router.post("/log", auth_middleware_1.authenticateToken, siteAccess_middleware_1.allowQuickMoodCheckinOrSiteAccess, mood_controller_1.createMoodLog);
// QUICK history is free; full/all history requires access.
router.get("/history", auth_middleware_1.authenticateToken, siteAccess_middleware_1.allowQuickMoodHistoryOrSiteAccess, mood_controller_1.getMyMoodHistory);
// Individual mood details belong to the full Mood feature.
router.get("/:id", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, mood_controller_1.getMoodLogById);
exports.default = router;
