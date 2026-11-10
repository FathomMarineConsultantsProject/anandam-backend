import {
  Router,
} from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  getWellbeingQuestionnaires,
  getWellbeingQuestionnaireBySlug,
  submitWellbeingQuestionnaire,
  getWellbeingQuestionnaireHistory,
  unlockWellbeingAccess,
} from "../controllers/wellbeingQuestionnaire.controller";


const router =
  Router();


// Authentication is required.
// Entry costs WELLBEING_TOKEN_COST (default: 1 token) unless
// the user already has active Anandam site access.
// Questionnaire submission itself does not charge again.
router.use(
  authenticateToken
);


router.post(
  "/access",
  unlockWellbeingAccess
);


router.get(
  "/",
  getWellbeingQuestionnaires
);


router.get(
  "/:slug/history",
  getWellbeingQuestionnaireHistory
);


router.post(
  "/:slug/submit",
  submitWellbeingQuestionnaire
);


router.get(
  "/:slug",
  getWellbeingQuestionnaireBySlug
);


export default router;
