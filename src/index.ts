import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes
  from "./routes/auth.route";

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


// Marketplace

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

  

import notificationRoutes
  from "./routes/notification.route";

import videoCallRoutes
  from "./routes/videoCall.route";

import journalRoutes
  from "./routes/journal.route";


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
  (req, res) => {
    res.status(200).json({
      message:
        "Welcome to the Anandam Seafarer App API!",

      status:
        "Active",

      time:
        new Date().toISOString(),
    });
  }
);


// ======================================================
// EXISTING APP ROUTES
// ======================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/mood",
  moodRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/daily-plan",
  dailyPlanRoutes
);

app.use(
  "/api/habits",
  habitRouter
);

app.use(
  "/api/work-hours",
  workHoursRouter
);

app.use(
  "/api/google-calendar",
  googleCalendarRoutes
);

app.use(
  "/api/fitness",
  fitnessRoutes
);

app.use(
  "/api/breathing",
  breathingRoutes
);

app.use(
  "/api/blogs",
  blogRoutes
);

app.use(
  "/api/sleep-audio",
  sleepAudioRoutes
);

app.use(
  "/api/wellbeing-questionnaires",
  wellbeingQuestionnaireRoutes
);

// ======================================================
// JOURNAL
// ======================================================

app.use(
  "/api/journal",
  journalRoutes
);

// ======================================================
// PSYCHOMETRIC ASSESSMENTS
// ======================================================

app.use(
  "/api/psychometrics",
  psychometricRoutes
);


// ======================================================
// MARKETPLACE
// ======================================================

app.use(
  "/api/marketplace",
  marketplaceRoutes
);


// Normal user enquiry flow

app.use(
  "/api/enquiries",
  enquiryRoutes
);


// Normal user appointments

app.use(
  "/api/appointments",
  appointmentRoutes
);


// Existing practitioner-only enquiry/session area

app.use(
  "/api/practitioner",
  practitionerRoutes
);


// Practitioner registration onboarding / editable profile

app.use(
  "/api/practitioner-onboarding",
  practitionerOnboardingRoutes
);

// ======================================================
// TOKENS
// ======================================================

app.use(
  "/api/tokens",
  tokenRoutes
);

// User + practitioner notification bell

app.use(
  "/api/notifications",
  notificationRoutes
);


// ======================================================
// VIDEO CALLS
// USER + PRACTITIONER
// ======================================================

app.use(
  "/api/video",
  videoCallRoutes
);




// ======================================================
// START LOCAL SERVER
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
