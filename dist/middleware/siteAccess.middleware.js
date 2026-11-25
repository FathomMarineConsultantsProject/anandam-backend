"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSiteAccess = requireSiteAccess;
exports.allowQuickMoodCheckinOrSiteAccess = allowQuickMoodCheckinOrSiteAccess;
exports.allowQuickMoodHistoryOrSiteAccess = allowQuickMoodHistoryOrSiteAccess;
const siteAccess_service_1 = require("../services/siteAccess.service");
// ======================================================
// COMMON SITE ACCESS ERROR
// ======================================================
async function sendSiteAccessRequired(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
        return res
            .status(401)
            .json({
            status: "error",
            code: "UNAUTHORIZED",
            message: "Please sign in to continue.",
        });
    }
    const access = await (0, siteAccess_service_1.getSiteAccessStatus)(userId);
    return res
        .status(403)
        .json({
        status: "error",
        code: "SITE_ACCESS_REQUIRED",
        message: `You need ${access.tokenCost} tokens to unlock Anandam for ${access.durationDays} days.`,
        access,
    });
}
// ======================================================
// STANDARD PAID FEATURE ACCESS
// ======================================================
async function requireSiteAccess(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({
                status: "error",
                code: "UNAUTHORIZED",
                message: "Please sign in to continue.",
            });
        }
        const active = await (0, siteAccess_service_1.hasActiveSiteAccess)(userId);
        if (active) {
            return next();
        }
        return sendSiteAccessRequired(req, res);
    }
    catch (error) {
        console.error("requireSiteAccess error:", error);
        return res
            .status(500)
            .json({
            status: "error",
            code: "SITE_ACCESS_CHECK_FAILED",
            message: "Unable to verify Anandam access.",
        });
    }
}
// ======================================================
// DETECT QUICK MOOD REQUEST
// ======================================================
function isQuickMoodRequest(req) {
    const body = req.body || {};
    const explicitType = body.checkinType
        ? String(body.checkinType)
            .trim()
            .toUpperCase()
        : null;
    if (explicitType ===
        "QUICK") {
        return true;
    }
    if (explicitType &&
        explicitType !==
            "QUICK") {
        return false;
    }
    // Backwards compatibility:
    // moodScore only = QUICK.
    return (body.moodScore !==
        undefined &&
        body.energyLevel ===
            undefined &&
        body.stressLevel ===
            undefined &&
        body.hoursOfSleep ===
            undefined &&
        body.currentWorkload ===
            undefined &&
        body.additionalThoughts ===
            undefined &&
        body.feelings ===
            undefined &&
        body.journalEntry ===
            undefined);
}
// ======================================================
// QUICK MOOD SUBMISSION OR SITE ACCESS
//
// QUICK is always free for an authenticated user.
// FULL mood requires active site access.
// ======================================================
async function allowQuickMoodCheckinOrSiteAccess(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({
                status: "error",
                code: "UNAUTHORIZED",
                message: "Please sign in to continue.",
            });
        }
        if (isQuickMoodRequest(req)) {
            return next();
        }
        if (await (0, siteAccess_service_1.hasActiveSiteAccess)(userId)) {
            return next();
        }
        return sendSiteAccessRequired(req, res);
    }
    catch (error) {
        console.error("Mood access check error:", error);
        return res
            .status(500)
            .json({
            status: "error",
            code: "SITE_ACCESS_CHECK_FAILED",
            message: "Unable to verify mood check-in access.",
        });
    }
}
// ======================================================
// QUICK MOOD HISTORY OR SITE ACCESS
//
// GET /api/mood/history?type=QUICK is free.
// Any other mood history requires active site access.
// ======================================================
async function allowQuickMoodHistoryOrSiteAccess(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({
                status: "error",
                code: "UNAUTHORIZED",
                message: "Please sign in to continue.",
            });
        }
        const rawType = req.query.type;
        const type = Array.isArray(rawType)
            ? String(rawType[0] || "")
            : String(rawType || "");
        if (type
            .trim()
            .toUpperCase() ===
            "QUICK") {
            return next();
        }
        if (await (0, siteAccess_service_1.hasActiveSiteAccess)(userId)) {
            return next();
        }
        return sendSiteAccessRequired(req, res);
    }
    catch (error) {
        console.error("Mood history access check error:", error);
        return res
            .status(500)
            .json({
            status: "error",
            code: "SITE_ACCESS_CHECK_FAILED",
            message: "Unable to verify mood history access.",
        });
    }
}
