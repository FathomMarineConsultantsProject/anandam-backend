"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPsychometricTestsController = listPsychometricTestsController;
exports.getPsychometricTestController = getPsychometricTestController;
exports.startPsychometricAttemptController = startPsychometricAttemptController;
exports.getPsychometricDisclaimerController = getPsychometricDisclaimerController;
exports.acknowledgePsychometricDisclaimerController = acknowledgePsychometricDisclaimerController;
exports.getPsychometricAttemptController = getPsychometricAttemptController;
exports.savePsychometricAnswersController = savePsychometricAnswersController;
exports.startPsychometricSectionController = startPsychometricSectionController;
exports.submitPsychometricSectionController = submitPsychometricSectionController;
exports.submitPsychometricAttemptController = submitPsychometricAttemptController;
exports.getPsychometricResultController = getPsychometricResultController;
exports.getPsychometricHistoryController = getPsychometricHistoryController;
exports.unlockPsychometricAnswersController = unlockPsychometricAnswersController;
const client_1 = require("@prisma/client");
const psychometric_service_1 = require("../services/psychometric.service");
const psychometricResultEmail_service_1 = require("../services/psychometricResultEmail.service");
function getUserId(req) {
    return (req.userId ||
        req.user?.userId ||
        req.user?.id ||
        null);
}
function requireUserId(req) {
    const userId = getUserId(req);
    if (!userId) {
        const error = new Error("Authentication required.");
        error.statusCode =
            401;
        throw error;
    }
    return userId;
}
function asString(value) {
    if (Array.isArray(value)) {
        return value[0] || "";
    }
    return value || "";
}
async function listPsychometricTestsController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const result = await (0, psychometric_service_1.listPsychometricTests)(userId);
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
}
async function getPsychometricTestController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const code = asString(req.params.code);
        const result = await (0, psychometric_service_1.getPsychometricTest)(userId, code);
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
}
async function startPsychometricAttemptController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const code = asString(req.params.code);
        const confirmTokenSpend = req.body?.confirmTokenSpend ===
            true;
        const result = await (0, psychometric_service_1.startPsychometricAttempt)(userId, code, confirmTokenSpend);
        // ==================================================
        // TOKEN CONFIRMATION / INSUFFICIENT BALANCE
        //
        // No attempt has been created.
        // No token has been deducted.
        // ==================================================
        if ("paymentRequired" in
            result &&
            result.paymentRequired) {
            return res
                .status(402)
                .json({
                message: result.hasEnoughTokens
                    ? `${result.requiredTokens} token${result.requiredTokens ===
                        1
                        ? ""
                        : "s"} required to start another attempt.`
                    : `Insufficient token balance. You need ${result.requiredTokens} token${result.requiredTokens ===
                        1
                        ? ""
                        : "s"} to start another attempt.`,
                code: result.hasEnoughTokens
                    ? "TOKEN_CONFIRMATION_REQUIRED"
                    : "INSUFFICIENT_TOKENS",
                requiredTokens: result.requiredTokens,
                walletBalance: result.walletBalance,
                hasEnoughTokens: result.hasEnoughTokens,
                attemptNumber: result.attemptNumber,
                testCode: result.testCode,
                testTitle: result.testTitle,
            });
        }
        // ==================================================
        // FREE ATTEMPT / CONFIRMED TOKEN ATTEMPT /
        // EXISTING IN-PROGRESS ATTEMPT
        // ==================================================
        return res
            .status(201)
            .json({
            attempt: result,
        });
    }
    catch (error) {
        next(error);
    }
}
// ======================================================
// DISCLAIMER
// ======================================================
async function getPsychometricDisclaimerController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const disclaimer = await (0, psychometric_service_1.getPsychometricDisclaimer)(userId, attemptId);
        return res
            .status(200)
            .json({
            disclaimer,
        });
    }
    catch (error) {
        next(error);
    }
}
async function acknowledgePsychometricDisclaimerController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        if (req.body?.accepted !== true) {
            return res
                .status(400)
                .json({
                message: "You must confirm that you have read and understood the disclaimer.",
                code: "DISCLAIMER_ACCEPTANCE_REQUIRED",
            });
        }
        const acknowledgement = await (0, psychometric_service_1.acknowledgePsychometricDisclaimer)(userId, attemptId);
        return res
            .status(200)
            .json({
            acknowledgement,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getPsychometricAttemptController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const attempt = await (0, psychometric_service_1.getPsychometricAttempt)(userId, attemptId);
        return res.status(200).json({
            attempt,
        });
    }
    catch (error) {
        next(error);
    }
}
async function savePsychometricAnswersController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const answers = Array.isArray(req.body?.answers)
            ? req.body.answers
            : [];
        if (answers.length === 0) {
            return res.status(400).json({
                message: "At least one answer is required.",
            });
        }
        const result = await (0, psychometric_service_1.savePsychometricAnswers)(userId, attemptId, answers);
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
}
async function startPsychometricSectionController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const sectionCode = asString(req.params.sectionCode).toUpperCase();
        if (!Object.values(client_1.PsychometricSectionCode).includes(sectionCode)) {
            return res.status(400).json({
                message: "Invalid section code.",
            });
        }
        const result = await (0, psychometric_service_1.startPsychometricSection)(userId, attemptId, sectionCode);
        return res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
}
async function submitPsychometricSectionController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const sectionCode = asString(req.params.sectionCode).toUpperCase();
        if (!Object.values(client_1.PsychometricSectionCode).includes(sectionCode)) {
            return res.status(400).json({
                message: "Invalid section code.",
                code: "INVALID_SECTION_CODE",
            });
        }
        const answers = Array.isArray(req.body?.answers)
            ? req.body.answers
            : [];
        // Save any answers sent together
        // with the section submission.
        if (answers.length >
            0) {
            await (0, psychometric_service_1.savePsychometricAnswers)(userId, attemptId, answers);
        }
        const result = await (0, psychometric_service_1.submitPsychometricSection)(userId, attemptId, sectionCode);
        if (result.completed) {
            await (0, psychometricResultEmail_service_1.sendCompletedPsychometricResultEmailSafely)(userId, attemptId);
        }
        return res
            .status(200)
            .json(result);
    }
    catch (error) {
        next(error);
    }
}
async function submitPsychometricAttemptController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const answers = Array.isArray(req.body?.answers)
            ? req.body.answers
            : [];
        if (answers.length >
            0) {
            await (0, psychometric_service_1.savePsychometricAnswers)(userId, attemptId, answers);
        }
        const result = await (0, psychometric_service_1.submitPsychometricAttempt)(userId, attemptId);
        if (result.completed) {
            await (0, psychometricResultEmail_service_1.sendCompletedPsychometricResultEmailSafely)(userId, attemptId);
        }
        return res
            .status(200)
            .json(result);
    }
    catch (error) {
        next(error);
    }
}
async function getPsychometricResultController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const result = await (0, psychometric_service_1.getPsychometricResult)(userId, attemptId);
        return res.status(200).json({
            result,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getPsychometricHistoryController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const history = await (0, psychometric_service_1.getPsychometricHistory)(userId);
        return res.status(200).json({
            history,
        });
    }
    catch (error) {
        next(error);
    }
}
// ======================================================
// UNLOCK CORRECT ANSWERS
// ======================================================
async function unlockPsychometricAnswersController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params.attemptId);
        const result = await (0, psychometric_service_1.unlockPsychometricAnswers)(userId, attemptId);
        return res
            .status(200)
            .json({
            result,
        });
    }
    catch (error) {
        next(error);
    }
}
