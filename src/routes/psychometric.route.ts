import express from "express";

import {
  authenticateToken,
} from "../middleware/auth.middleware";

import {
  acknowledgePsychometricDisclaimerController,
  getPsychometricAttemptController,
  getPsychometricDisclaimerController,
  getPsychometricHistoryController,
  getPsychometricResultController,
  getPsychometricTestController,
  listPsychometricTestsController,
  savePsychometricAnswersController,
  startPsychometricAttemptController,
  startPsychometricSectionController,
  submitPsychometricAttemptController,
  submitPsychometricSectionController,
  unlockPsychometricAnswersController,
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
// DISCLAIMER / ACKNOWLEDGEMENT
// ======================================================

router.get(
  "/attempts/:attemptId/disclaimer",
  getPsychometricDisclaimerController
);

router.post(
  "/attempts/:attemptId/disclaimer/acknowledge",
  acknowledgePsychometricDisclaimerController
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
// UNLOCK CORRECT ANSWERS
// ======================================================

router.post(
  "/attempts/:attemptId/unlock-answers",
  unlockPsychometricAnswersController
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
