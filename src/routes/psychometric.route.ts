import express from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  getPsychometricAttemptController,
  getPsychometricHistoryController,
  getPsychometricResultController,
  getPsychometricTestController,
  listPsychometricTestsController,
  savePsychometricAnswersController,
  startPsychometricAttemptController,
  startPsychometricSectionController,
  submitPsychometricAttemptController,
  submitPsychometricSectionController,
} from "../controllers/psychometric.controller";


const router =
  express.Router();


router.use(
  authenticateToken
);


// ======================================================
// TEST CATALOGUE
// ======================================================

router.get(
  "/tests",
  listPsychometricTestsController
);

router.get(
  "/tests/:code",
  getPsychometricTestController
);


// ======================================================
// START / RESUME ATTEMPT
// ======================================================

router.post(
  "/tests/:code/start",
  startPsychometricAttemptController
);


// ======================================================
// HISTORY
// IMPORTANT: keep before /attempts/:attemptId
// ======================================================

router.get(
  "/history",
  getPsychometricHistoryController
);


// ======================================================
// ATTEMPT
// ======================================================

router.get(
  "/attempts/:attemptId",
  getPsychometricAttemptController
);

router.post(
  "/attempts/:attemptId/answers",
  savePsychometricAnswersController
);


// ======================================================
// MARITIME SECTION FLOW
// ======================================================

router.post(
  "/attempts/:attemptId/sections/:sectionCode/start",
  startPsychometricSectionController
);

router.post(
  "/attempts/:attemptId/sections/:sectionCode/submit",
  submitPsychometricSectionController
);


// ======================================================
// SINGLE-PAGE LIKERT TEST SUBMISSION
// ======================================================

router.post(
  "/attempts/:attemptId/submit",
  submitPsychometricAttemptController
);


// ======================================================
// RESULT
// ======================================================

router.get(
  "/attempts/:attemptId/result",
  getPsychometricResultController
);


export default router;
