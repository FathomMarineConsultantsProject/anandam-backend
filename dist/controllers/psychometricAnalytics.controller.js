"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPsychometricAnalysisController = getPsychometricAnalysisController;
exports.downloadPsychometricReportController = downloadPsychometricReportController;
const psychometricAnalytics_service_1 = require("../services/psychometricAnalytics.service");
const psychometricReport_service_1 = require("../services/psychometricReport.service");
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
        return (value[0] ||
            "");
    }
    return (value ||
        "");
}
// ======================================================
// GET RESULT ANALYTICS
//
// GET
// /api/psychometrics/attempts/:attemptId/analysis
// ======================================================
async function getPsychometricAnalysisController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params
            .attemptId);
        const analysis = await (0, psychometricAnalytics_service_1.getPsychometricAnalysis)(userId, attemptId);
        return res
            .status(200)
            .json({
            analysis,
        });
    }
    catch (error) {
        next(error);
    }
}
// ======================================================
// DOWNLOAD PDF REPORT
//
// GET
// /api/psychometrics/attempts/:attemptId/report.pdf
// ======================================================
async function downloadPsychometricReportController(req, res, next) {
    try {
        const userId = requireUserId(req);
        const attemptId = asString(req.params
            .attemptId);
        const report = await (0, psychometricReport_service_1.generatePsychometricReport)(userId, attemptId);
        /*
          =====================================================
          FRONTEND JSON DOWNLOAD MODE
    
          Your normal frontend API client already handles
          authenticated JSON requests.
    
          Calling:
    
          /report.pdf?format=base64
    
          returns the PDF as base64 JSON so the frontend can
          download it while still sending the Bearer token.
    
          Normal /report.pdf still returns a real binary PDF.
          =====================================================
        */
        const format = String(req.query
            ?.format ||
            "")
            .trim()
            .toLowerCase();
        if (format ===
            "base64") {
            return res
                .status(200)
                .json({
                report: {
                    filename: report.filename,
                    contentType: "application/pdf",
                    base64: report.buffer
                        .toString("base64"),
                },
            });
        }
        // =====================================================
        // NORMAL BINARY PDF RESPONSE
        // =====================================================
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
        res.setHeader("Content-Length", String(report.buffer
            .length));
        return res
            .status(200)
            .send(report.buffer);
    }
    catch (error) {
        next(error);
    }
}
