import {
  Router,
} from "express";

import {
  // My Day
  getDailyPlan,
  createActivity,
  updateActivity,
  deleteActivity,
  toggleActivityStatus,

  // Templates
  getAllTemplates,
  getMyTemplates,
  getMyTemplateById,
  createMyTemplate,
  updateMyTemplate,
  deleteMyTemplate,

  // Template activities
  addTemplateActivity,
  updateTemplateActivity,
  deleteTemplateActivity,

  // Apply template
  applyTemplate,

  // Progress
  getPlannerProgress,
} from "../controllers/dailyPlan.controller";

import {
  authenticateToken,
} from "../middleware/auth.middleware";


const router =
  Router();


// ======================================================
// AVAILABLE TEMPLATES
// Built-in + user's own templates
// ======================================================

router.get(
  "/templates",
  authenticateToken,
  getAllTemplates
);


router.post(
  "/templates/apply",
  authenticateToken,
  applyTemplate
);


// ======================================================
// MY TEMPLATES
// ======================================================

router.get(
  "/my-templates",
  authenticateToken,
  getMyTemplates
);


router.post(
  "/my-templates",
  authenticateToken,
  createMyTemplate
);


router.get(
  "/my-templates/:templateId",
  authenticateToken,
  getMyTemplateById
);


router.patch(
  "/my-templates/:templateId",
  authenticateToken,
  updateMyTemplate
);


router.delete(
  "/my-templates/:templateId",
  authenticateToken,
  deleteMyTemplate
);


// ======================================================
// TEMPLATE ACTIVITY MANAGEMENT
// ======================================================

router.post(
  "/my-templates/:templateId/activities",
  authenticateToken,
  addTemplateActivity
);


router.patch(
  "/my-templates/:templateId/activities/:activityId",
  authenticateToken,
  updateTemplateActivity
);


router.delete(
  "/my-templates/:templateId/activities/:activityId",
  authenticateToken,
  deleteTemplateActivity
);


// ======================================================
// MY DAY
// ======================================================

router.get(
  "/day/:date",
  authenticateToken,
  getDailyPlan
);


// Add Activity drawer
router.post(
  "/activities",
  authenticateToken,
  createActivity
);


// Three-dot menu -> Edit
router.patch(
  "/activities/:activityId",
  authenticateToken,
  updateActivity
);


// Checkbox
router.patch(
  "/activities/:activityId/status",
  authenticateToken,
  toggleActivityStatus
);


// Three-dot menu -> Delete
router.delete(
  "/activities/:activityId",
  authenticateToken,
  deleteActivity
);


// ======================================================
// PROGRESS
// ======================================================

router.get(
  "/progress",
  authenticateToken,
  getPlannerProgress
);


// ======================================================
// OLD API COMPATIBILITY
//
// Keep temporarily while old frontend code exists.
// ======================================================

router.post(
  "/apply",
  authenticateToken,
  applyTemplate
);


router.get(
  "/:date",
  authenticateToken,
  getDailyPlan
);


router.patch(
  "/activity/:activityId",
  authenticateToken,
  toggleActivityStatus
);


export default router;