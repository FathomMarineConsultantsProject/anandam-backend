import express
  from "express";

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

import {
  downloadPsychometricReportController,
  getPsychometricAnalysisController,
} from "../controllers/psychometricAnalytics.controller";


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
//
// IMPORTANT:
// keep before /attempts/:attemptId
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
// CURRENT RAW RESULT
//
// Kept for backwards compatibility.
// Existing FE continues working.
// ======================================================

router.get(
  "/attempts/:attemptId/result",
  getPsychometricResultController
);


// ======================================================
// NEW ANALYTICAL RESULT
//
// Used by the new Figma result screen.
// ======================================================

router.get(
  "/attempts/:attemptId/analysis",
  getPsychometricAnalysisController
);


// ======================================================
// PDF REPORT
// ======================================================

router.get(
  "/attempts/:attemptId/report.pdf",
  downloadPsychometricReportController
);


export default router;