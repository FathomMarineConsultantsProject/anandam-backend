"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// ======================================================
// AUTH / ACCESS
// ======================================================
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const siteAccess_route_1 = __importDefault(require("./routes/siteAccess.route"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const siteAccess_middleware_1 = require("./middleware/siteAccess.middleware");
// ======================================================
// CORE APP ROUTES
// ======================================================
const mood_route_1 = __importDefault(require("./routes/mood.route"));
const profile_route_1 = __importDefault(require("./routes/profile.route"));
const dailyPlan_route_1 = __importDefault(require("./routes/dailyPlan.route"));
const habit_route_1 = __importDefault(require("./routes/habit.route"));
const workHours_route_1 = __importDefault(require("./routes/workHours.route"));
const googleCalendar_route_1 = __importDefault(require("./routes/googleCalendar.route"));
const fitness_route_1 = __importDefault(require("./routes/fitness.route"));
const breathing_route_1 = __importDefault(require("./routes/breathing.route"));
const blog_route_1 = __importDefault(require("./routes/blog.route"));
const sleepAudio_route_1 = __importDefault(require("./routes/sleepAudio.route"));
const wellbeingQuestionnaire_route_1 = __importDefault(require("./routes/wellbeingQuestionnaire.route"));
const token_route_1 = __importDefault(require("./routes/token.route"));
const psychometric_route_1 = __importDefault(require("./routes/psychometric.route"));
const journal_route_1 = __importDefault(require("./routes/journal.route"));
// ======================================================
// MARKETPLACE
// ======================================================
const marketplace_route_1 = __importDefault(require("./routes/marketplace.route"));
const enquiry_route_1 = __importDefault(require("./routes/enquiry.route"));
const appointment_route_1 = __importDefault(require("./routes/appointment.route"));
const practitioner_route_1 = __importDefault(require("./routes/practitioner.route"));
const practitionerOnboarding_route_1 = __importDefault(require("./routes/practitionerOnboarding.route"));
const resortOwner_route_1 = __importDefault(require("./routes/resortOwner.route"));
const resortPublic_route_1 = __importDefault(require("./routes/resortPublic.route"));
// ======================================================
// NOTIFICATIONS / VIDEO
// ======================================================
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const videoCall_route_1 = __importDefault(require("./routes/videoCall.route"));
// ======================================================
// PSYCHOMETRIC ERROR
// ======================================================
const psychometric_service_1 = require("./services/psychometric.service");
// ======================================================
// APP
// ======================================================
const app = (0, express_1.default)();
const PORT = process.env.PORT ||
    5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ======================================================
// HEALTH CHECK
// ======================================================
app.get("/", (_req, res) => {
    res
        .status(200)
        .json({
        message: "Welcome to the Anandam Seafarer App API!",
        status: "Active",
        time: new Date()
            .toISOString(),
    });
});
// ======================================================
// AUTH
//
// FREE
// ======================================================
app.use("/api/auth", auth_route_1.default);
// ======================================================
// SITE ACCESS
//
// FREE TO CHECK / ACTIVATE
// ======================================================
app.use("/api/site-access", siteAccess_route_1.default);
// ======================================================
// RESORT OWNERS: free onboarding and management
// Public listing discovery is separate from paid practitioner marketplace.
// ======================================================
app.use("/api/resort-owner", resortOwner_route_1.default);
app.use("/api/resorts", resortPublic_route_1.default);
// ======================================================
// PROFILE
//
// FREE ACCOUNT CONTROL
// ======================================================
app.use("/api/profile", profile_route_1.default);
// ======================================================
// TOKENS
//
// FREE ACCOUNT / PAYMENT CONTROL
// ======================================================
app.use("/api/tokens", token_route_1.default);
// ======================================================
// NOTIFICATIONS
//
// FREE HEADER / ACCOUNT CONTROL
// ======================================================
app.use("/api/notifications", notification_route_1.default);
// ======================================================
// BLOGS
//
// FREE
//
// Keep existing public/private blog logic.
// DO NOT place requireSiteAccess here.
// ======================================================
app.use("/api/blogs", blog_route_1.default);
// ======================================================
// WELLBEING QUESTIONNAIRES
//
// PAY-PER-ENTRY FEATURE
//
// Frontend requests POST /api/wellbeing-questionnaires/access
// when entering the Wellbeing area. Without active site access,
// that endpoint deducts WELLBEING_TOKEN_COST (default 1 token).
// Questionnaire submission itself does not charge again.
// ======================================================
app.use("/api/wellbeing-questionnaires", wellbeingQuestionnaire_route_1.default);
// ======================================================
// PSYCHOMETRIC TESTS
//
// These live inside the Wellbeing area. The frontend Wellbeing
// entry gate handles the 1-token entry charge when there is no
// active site pass. Existing psychometric attempt/token charges
// remain separate and continue to work inside the test flow.
//
// Do NOT apply requireSiteAccess here, otherwise a user who paid
// the 1-token Wellbeing entry charge would still be blocked.
// ======================================================
app.use("/api/psychometrics", psychometric_route_1.default);
// ======================================================
// PREMIUM / SITE-ACCESS FEATURES
// ======================================================
// ------------------------------------------------------
// MOOD
// ------------------------------------------------------
app.use("/api/mood", mood_route_1.default);
// ------------------------------------------------------
// DAY PLANNER
// ------------------------------------------------------
app.use("/api/daily-plan", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, dailyPlan_route_1.default);
// ------------------------------------------------------
// HABITS
// ------------------------------------------------------
app.use("/api/habits", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, habit_route_1.default);
// ------------------------------------------------------
// WORK / REST
// ------------------------------------------------------
app.use("/api/work-hours", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, workHours_route_1.default);
// ------------------------------------------------------
// GOOGLE CALENDAR
// ------------------------------------------------------
app.use("/api/google-calendar", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, googleCalendar_route_1.default);
// ------------------------------------------------------
// FITNESS
// ------------------------------------------------------
app.use("/api/fitness", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, fitness_route_1.default);
// ------------------------------------------------------
// BREATHING
// ------------------------------------------------------
app.use("/api/breathing", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, breathing_route_1.default);
// ------------------------------------------------------
// SLEEP
// ------------------------------------------------------
app.use("/api/sleep-audio", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, sleepAudio_route_1.default);
// ------------------------------------------------------
// JOURNAL
// ------------------------------------------------------
app.use("/api/journal", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, journal_route_1.default);
// ------------------------------------------------------
// MARKETPLACE
// ------------------------------------------------------
app.use("/api/marketplace", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, marketplace_route_1.default);
// ------------------------------------------------------
// ENQUIRIES
// ------------------------------------------------------
app.use("/api/enquiries", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, enquiry_route_1.default);
// ------------------------------------------------------
// APPOINTMENTS
// ------------------------------------------------------
app.use("/api/appointments", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, appointment_route_1.default);
// ------------------------------------------------------
// PRACTITIONER AREA
//
// Practitioner accounts automatically bypass
// the normal USER subscription restriction.
// ------------------------------------------------------
app.use("/api/practitioner", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, practitioner_route_1.default);
// Practitioner onboarding must be free for signed-in practitioner accounts.
// The onboarding router itself enforces authentication and PRACTITIONER role.
app.use("/api/practitioner-onboarding", practitionerOnboarding_route_1.default);
// ------------------------------------------------------
// VIDEO CALLS
// ------------------------------------------------------
app.use("/api/video", auth_middleware_1.authenticateToken, siteAccess_middleware_1.requireSiteAccess, videoCall_route_1.default);
// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================
app.use((error, _req, res, _next) => {
    console.error("API ERROR:", error);
    // ==================================================
    // PSYCHOMETRIC ERRORS
    // ==================================================
    if (error instanceof
        psychometric_service_1.PsychometricError) {
        return res
            .status(error.statusCode)
            .json({
            message: error.message,
            code: error.code ||
                "PSYCHOMETRIC_ERROR",
            ...(error.details ||
                {}),
        });
    }
    // ==================================================
    // ALL OTHER API ERRORS
    // ==================================================
    const statusCode = Number(error?.statusCode ||
        error?.status ||
        500);
    let code = "INTERNAL_SERVER_ERROR";
    if (statusCode ===
        400) {
        code =
            "BAD_REQUEST";
    }
    if (statusCode ===
        401) {
        code =
            "UNAUTHORIZED";
    }
    if (statusCode ===
        402) {
        code =
            "PAYMENT_REQUIRED";
    }
    if (statusCode ===
        403) {
        code =
            "FORBIDDEN";
    }
    if (statusCode ===
        404) {
        code =
            "NOT_FOUND";
    }
    if (statusCode ===
        409) {
        code =
            "CONFLICT";
    }
    return res
        .status(statusCode)
        .json({
        message: error?.message ||
            "Something went wrong.",
        code,
    });
});
// ======================================================
// LOCAL SERVER
// ======================================================
if (process.env.NODE_ENV !==
    "production") {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
exports.default = app;
