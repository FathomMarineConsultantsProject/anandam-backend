"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dailyPlan_controller_1 = require("../controllers/dailyPlan.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ======================================================
// AVAILABLE TEMPLATES
// Built-in + user's own templates
// ======================================================
router.get("/templates", auth_middleware_1.authenticateToken, dailyPlan_controller_1.getAllTemplates);
router.post("/templates/apply", auth_middleware_1.authenticateToken, dailyPlan_controller_1.applyTemplate);
// ======================================================
// MY TEMPLATES
// ======================================================
router.get("/my-templates", auth_middleware_1.authenticateToken, dailyPlan_controller_1.getMyTemplates);
router.post("/my-templates", auth_middleware_1.authenticateToken, dailyPlan_controller_1.createMyTemplate);
router.get("/my-templates/:templateId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.getMyTemplateById);
router.patch("/my-templates/:templateId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.updateMyTemplate);
router.delete("/my-templates/:templateId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.deleteMyTemplate);
// ======================================================
// TEMPLATE ACTIVITY MANAGEMENT
// ======================================================
router.post("/my-templates/:templateId/activities", auth_middleware_1.authenticateToken, dailyPlan_controller_1.addTemplateActivity);
router.patch("/my-templates/:templateId/activities/:activityId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.updateTemplateActivity);
router.delete("/my-templates/:templateId/activities/:activityId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.deleteTemplateActivity);
// ======================================================
// MY DAY
// ======================================================
router.get("/day/:date", auth_middleware_1.authenticateToken, dailyPlan_controller_1.getDailyPlan);
// Add Activity drawer
router.post("/activities", auth_middleware_1.authenticateToken, dailyPlan_controller_1.createActivity);
// Three-dot menu -> Edit
router.patch("/activities/:activityId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.updateActivity);
// Checkbox
router.patch("/activities/:activityId/status", auth_middleware_1.authenticateToken, dailyPlan_controller_1.toggleActivityStatus);
// Three-dot menu -> Delete
router.delete("/activities/:activityId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.deleteActivity);
// ======================================================
// PROGRESS
// ======================================================
router.get("/progress", auth_middleware_1.authenticateToken, dailyPlan_controller_1.getPlannerProgress);
// ======================================================
// OLD API COMPATIBILITY
//
// Keep temporarily while old frontend code exists.
// ======================================================
router.post("/apply", auth_middleware_1.authenticateToken, dailyPlan_controller_1.applyTemplate);
router.get("/:date", auth_middleware_1.authenticateToken, dailyPlan_controller_1.getDailyPlan);
router.patch("/activity/:activityId", auth_middleware_1.authenticateToken, dailyPlan_controller_1.toggleActivityStatus);
exports.default = router;
