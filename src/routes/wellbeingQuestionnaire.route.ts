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
} from "../controllers/wellbeingQuestionnaire.controller";


const router =
  Router();


router.use(
  authenticateToken
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