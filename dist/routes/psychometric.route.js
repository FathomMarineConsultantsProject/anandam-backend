"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const psychometric_controller_1 = require("../controllers/psychometric.controller");
const psychometricAnalytics_controller_1 = require("../controllers/psychometricAnalytics.controller");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticateToken);
// ======================================================
// TEST CATALOGUE
// ======================================================
router.get("/tests", psychometric_controller_1.listPsychometricTestsController);
router.get("/tests/:code", psychometric_controller_1.getPsychometricTestController);
// ======================================================
// START / RESUME ATTEMPT
// ======================================================
router.post("/tests/:code/start", psychometric_controller_1.startPsychometricAttemptController);
// ======================================================
// DISCLAIMER / ACKNOWLEDGEMENT
// ======================================================
router.get("/attempts/:attemptId/disclaimer", psychometric_controller_1.getPsychometricDisclaimerController);
router.post("/attempts/:attemptId/disclaimer/acknowledge", psychometric_controller_1.acknowledgePsychometricDisclaimerController);
// ======================================================
// HISTORY
//
// IMPORTANT:
// keep before /attempts/:attemptId
// ======================================================
router.get("/history", psychometric_controller_1.getPsychometricHistoryController);
// ======================================================
// ATTEMPT
// ======================================================
router.get("/attempts/:attemptId", psychometric_controller_1.getPsychometricAttemptController);
router.post("/attempts/:attemptId/answers", psychometric_controller_1.savePsychometricAnswersController);
// ======================================================
// UNLOCK CORRECT ANSWERS
// ======================================================
router.post("/attempts/:attemptId/unlock-answers", psychometric_controller_1.unlockPsychometricAnswersController);
// ======================================================
// MARITIME SECTION FLOW
// ======================================================
router.post("/attempts/:attemptId/sections/:sectionCode/start", psychometric_controller_1.startPsychometricSectionController);
router.post("/attempts/:attemptId/sections/:sectionCode/submit", psychometric_controller_1.submitPsychometricSectionController);
// ======================================================
// SINGLE-PAGE LIKERT TEST SUBMISSION
// ======================================================
router.post("/attempts/:attemptId/submit", psychometric_controller_1.submitPsychometricAttemptController);
// ======================================================
// CURRENT RAW RESULT
//
// Kept for backwards compatibility.
// Existing FE continues working.
// ======================================================
router.get("/attempts/:attemptId/result", psychometric_controller_1.getPsychometricResultController);
// ======================================================
// NEW ANALYTICAL RESULT
//
// Used by the new Figma result screen.
// ======================================================
router.get("/attempts/:attemptId/analysis", psychometricAnalytics_controller_1.getPsychometricAnalysisController);
// ======================================================
// PDF REPORT
// ======================================================
router.get("/attempts/:attemptId/report.pdf", psychometricAnalytics_controller_1.downloadPsychometricReportController);
exports.default = router;
