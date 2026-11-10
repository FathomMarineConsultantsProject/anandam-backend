import "dotenv/config";

import express from "express";
import cors from "cors";


// ======================================================
// AUTH / ACCESS
// ======================================================

import authRoutes
  from "./routes/auth.route";

import siteAccessRoutes
  from "./routes/siteAccess.route";

import {
  authenticateToken,
} from "./middleware/auth.middleware";

import {
  requireSiteAccess,
} from "./middleware/siteAccess.middleware";


// ======================================================
// CORE APP ROUTES
// ======================================================

import moodRoutes
  from "./routes/mood.route";

import profileRoutes
  from "./routes/profile.route";

import dailyPlanRoutes
  from "./routes/dailyPlan.route";

import habitRouter
  from "./routes/habit.route";

import workHoursRouter
  from "./routes/workHours.route";

import googleCalendarRoutes
  from "./routes/googleCalendar.route";

import fitnessRoutes
  from "./routes/fitness.route";

import breathingRoutes
  from "./routes/breathing.route";

import blogRoutes
  from "./routes/blog.route";

import sleepAudioRoutes
  from "./routes/sleepAudio.route";

import wellbeingQuestionnaireRoutes
  from "./routes/wellbeingQuestionnaire.route";

import tokenRoutes
  from "./routes/token.route";

import psychometricRoutes
  from "./routes/psychometric.route";

import journalRoutes
  from "./routes/journal.route";


// ======================================================
// MARKETPLACE
// ======================================================

import marketplaceRoutes
  from "./routes/marketplace.route";

import enquiryRoutes
  from "./routes/enquiry.route";

import appointmentRoutes
  from "./routes/appointment.route";

import practitionerRoutes
  from "./routes/practitioner.route";

import practitionerOnboardingRoutes
  from "./routes/practitionerOnboarding.route";


// ======================================================
// NOTIFICATIONS / VIDEO
// ======================================================

import notificationRoutes
  from "./routes/notification.route";

import videoCallRoutes
  from "./routes/videoCall.route";


// ======================================================
// PSYCHOMETRIC ERROR
// ======================================================

import {
  PsychometricError,
} from "./services/psychometric.service";


// ======================================================
// APP
// ======================================================

const app =
  express();


const PORT =
  process.env.PORT ||
  5000;


app.use(
  cors()
);


app.use(
  express.json()
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/",
  (
    _req,
    res
  ) => {
    res
      .status(200)
      .json({
        message:
          "Welcome to the Anandam Seafarer App API!",

        status:
          "Active",

        time:
          new Date()
            .toISOString(),
      });
  }
);


// ======================================================
// AUTH
//
// FREE
// ======================================================

app.use(
  "/api/auth",
  authRoutes
);


// ======================================================
// SITE ACCESS
//
// FREE TO CHECK / ACTIVATE
// ======================================================

app.use(
  "/api/site-access",
  siteAccessRoutes
);


// ======================================================
// PROFILE
//
// FREE ACCOUNT CONTROL
// ======================================================

app.use(
  "/api/profile",
  profileRoutes
);


// ======================================================
// TOKENS
//
// FREE ACCOUNT / PAYMENT CONTROL
// ======================================================

app.use(
  "/api/tokens",
  tokenRoutes
);


// ======================================================
// NOTIFICATIONS
//
// FREE HEADER / ACCOUNT CONTROL
// ======================================================

app.use(
  "/api/notifications",
  notificationRoutes
);


// ======================================================
// BLOGS
//
// FREE
//
// Keep existing public/private blog logic.
// DO NOT place requireSiteAccess here.
// ======================================================

app.use(
  "/api/blogs",
  blogRoutes
);


// ======================================================
// WELLBEING QUESTIONNAIRES
//
// FREE
//
// Existing questionnaire eligibility rules still apply.
// ======================================================

app.use(
  "/api/wellbeing-questionnaires",
  wellbeingQuestionnaireRoutes
);


// ======================================================
// PSYCHOMETRIC TESTS
//
// IMPORTANT:
//
// DO NOT apply SiteAccess here.
//
// Psychometrics already have their own token/free-attempt
// payment rules.
// Applying SiteAccess here would cause double charging.
// ======================================================

app.use(
  "/api/psychometrics",
  psychometricRoutes
);


// ======================================================
// PREMIUM / SITE-ACCESS FEATURES
// ======================================================


// ------------------------------------------------------
// MOOD
// ------------------------------------------------------

app.use(
  "/api/mood",
  authenticateToken,
  requireSiteAccess,
  moodRoutes
);


// ------------------------------------------------------
// DAY PLANNER
// ------------------------------------------------------

app.use(
  "/api/daily-plan",
  authenticateToken,
  requireSiteAccess,
  dailyPlanRoutes
);


// ------------------------------------------------------
// HABITS
// ------------------------------------------------------

app.use(
  "/api/habits",
  authenticateToken,
  requireSiteAccess,
  habitRouter
);


// ------------------------------------------------------
// WORK / REST
// ------------------------------------------------------

app.use(
  "/api/work-hours",
  authenticateToken,
  requireSiteAccess,
  workHoursRouter
);


// ------------------------------------------------------
// GOOGLE CALENDAR
// ------------------------------------------------------

app.use(
  "/api/google-calendar",
  authenticateToken,
  requireSiteAccess,
  googleCalendarRoutes
);


// ------------------------------------------------------
// FITNESS
// ------------------------------------------------------

app.use(
  "/api/fitness",
  authenticateToken,
  requireSiteAccess,
  fitnessRoutes
);


// ------------------------------------------------------
// BREATHING
// ------------------------------------------------------

app.use(
  "/api/breathing",
  authenticateToken,
  requireSiteAccess,
  breathingRoutes
);


// ------------------------------------------------------
// SLEEP
// ------------------------------------------------------

app.use(
  "/api/sleep-audio",
  authenticateToken,
  requireSiteAccess,
  sleepAudioRoutes
);


// ------------------------------------------------------
// JOURNAL
// ------------------------------------------------------

app.use(
  "/api/journal",
  authenticateToken,
  requireSiteAccess,
  journalRoutes
);


// ------------------------------------------------------
// MARKETPLACE
// ------------------------------------------------------

app.use(
  "/api/marketplace",
  authenticateToken,
  requireSiteAccess,
  marketplaceRoutes
);


// ------------------------------------------------------
// ENQUIRIES
// ------------------------------------------------------

app.use(
  "/api/enquiries",
  authenticateToken,
  requireSiteAccess,
  enquiryRoutes
);


// ------------------------------------------------------
// APPOINTMENTS
// ------------------------------------------------------

app.use(
  "/api/appointments",
  authenticateToken,
  requireSiteAccess,
  appointmentRoutes
);


// ------------------------------------------------------
// PRACTITIONER AREA
//
// Practitioner accounts automatically bypass
// the normal USER subscription restriction.
// ------------------------------------------------------

app.use(
  "/api/practitioner",
  authenticateToken,
  requireSiteAccess,
  practitionerRoutes
);


app.use(
  "/api/practitioner-onboarding",
  authenticateToken,
  requireSiteAccess,
  practitionerOnboardingRoutes
);


// ------------------------------------------------------
// VIDEO CALLS
// ------------------------------------------------------

app.use(
  "/api/video",
  authenticateToken,
  requireSiteAccess,
  videoCallRoutes
);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(
      "API ERROR:",
      error
    );


    // ==================================================
    // PSYCHOMETRIC ERRORS
    // ==================================================

    if (
      error instanceof
      PsychometricError
    ) {
      return res
        .status(
          error.statusCode
        )
        .json({
          message:
            error.message,

          code:
            error.code ||
            "PSYCHOMETRIC_ERROR",

          ...(
            error.details ||
            {}
          ),
        });
    }


    // ==================================================
    // ALL OTHER API ERRORS
    // ==================================================

    const statusCode =
      Number(
        error?.statusCode ||
        error?.status ||
        500
      );


    let code =
      "INTERNAL_SERVER_ERROR";


    if (
      statusCode ===
      400
    ) {
      code =
        "BAD_REQUEST";
    }


    if (
      statusCode ===
      401
    ) {
      code =
        "UNAUTHORIZED";
    }


    if (
      statusCode ===
      402
    ) {
      code =
        "PAYMENT_REQUIRED";
    }


    if (
      statusCode ===
      403
    ) {
      code =
        "FORBIDDEN";
    }


    if (
      statusCode ===
      404
    ) {
      code =
        "NOT_FOUND";
    }


    if (
      statusCode ===
      409
    ) {
      code =
        "CONFLICT";
    }


    return res
      .status(
        statusCode
      )
      .json({
        message:
          error?.message ||
          "Something went wrong.",

        code,
      });
  }
);


// ======================================================
// LOCAL SERVER
// ======================================================

if (
  process.env.NODE_ENV !==
  "production"
) {
  app.listen(
    PORT,
    () => {
      console.log(
        `Server is running on http://localhost:${PORT}`
      );
    }
  );
}


export default app;