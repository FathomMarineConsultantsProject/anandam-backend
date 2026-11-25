"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySiteAccess = getMySiteAccess;
exports.activateMySiteAccess = activateMySiteAccess;
const siteAccess_service_1 = require("../services/siteAccess.service");
// ======================================================
// GET MY SITE ACCESS
//
// GET /api/site-access/me
// ======================================================
async function getMySiteAccess(req, res) {
    try {
        const userId = req
            .user
            ?.userId;
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
            .status(200)
            .json({
            status: "success",
            access,
        });
    }
    catch (error) {
        console.error("getMySiteAccess error:", error);
        if (error instanceof
            siteAccess_service_1.SiteAccessError) {
            return res
                .status(error.statusCode)
                .json({
                status: "error",
                code: error.code,
                message: error.message,
                ...(error.details ||
                    {}),
            });
        }
        return res
            .status(500)
            .json({
            status: "error",
            code: "SITE_ACCESS_LOAD_FAILED",
            message: "Unable to load Anandam access information.",
        });
    }
}
// ======================================================
// ACTIVATE / EXTEND SITE ACCESS
//
// POST /api/site-access/activate
//
// Default body can be empty:
//   30 tokens -> 30 days
//
// Optional:
//   { "tokenAmount": 0.5 }
//   0.5 token -> 12 hours
// ======================================================
async function activateMySiteAccess(req, res) {
    try {
        const userId = req
            .user
            ?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({
                status: "error",
                code: "UNAUTHORIZED",
                message: "Please sign in to continue.",
            });
        }
        const access = await (0, siteAccess_service_1.activateSiteAccess)(userId, req.body?.tokenAmount);
        return res
            .status(200)
            .json({
            status: "success",
            message: access.accessType ===
                "ROLE_BYPASS"
                ? "Your account has unrestricted access."
                : "Anandam access activated successfully.",
            access,
        });
    }
    catch (error) {
        console.error("activateMySiteAccess error:", error);
        if (error instanceof
            siteAccess_service_1.SiteAccessError) {
            return res
                .status(error.statusCode)
                .json({
                status: "error",
                code: error.code,
                message: error.message,
                ...(error.details ||
                    {}),
            });
        }
        return res
            .status(500)
            .json({
            status: "error",
            code: "SITE_ACCESS_ACTIVATION_FAILED",
            message: "Unable to activate Anandam access.",
        });
    }
}
