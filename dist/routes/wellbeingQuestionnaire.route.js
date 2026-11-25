"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const wellbeingQuestionnaire_controller_1 = require("../controllers/wellbeingQuestionnaire.controller");
const router = (0, express_1.Router)();
// Authentication is required.
// Entry costs WELLBEING_TOKEN_COST (default: 1 token) unless
// the user already has active Anandam site access.
// Questionnaire submission itself does not charge again.
router.use(auth_middleware_1.authenticateToken);
router.post("/access", wellbeingQuestionnaire_controller_1.unlockWellbeingAccess);
router.get("/", wellbeingQuestionnaire_controller_1.getWellbeingQuestionnaires);
router.get("/:slug/history", wellbeingQuestionnaire_controller_1.getWellbeingQuestionnaireHistory);
router.post("/:slug/submit", wellbeingQuestionnaire_controller_1.submitWellbeingQuestionnaire);
router.get("/:slug", wellbeingQuestionnaire_controller_1.getWellbeingQuestionnaireBySlug);
exports.default = router;
