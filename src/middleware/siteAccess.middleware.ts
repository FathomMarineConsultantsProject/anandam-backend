import {
  NextFunction,
  Response,
} from "express";

import {
  AuthRequest,
} from "./auth.middleware";

import {
  getSiteAccessStatus,
  hasActiveSiteAccess,
} from "../services/siteAccess.service";

// ======================================================
// COMMON SITE ACCESS ERROR
// ======================================================

async function sendSiteAccessRequired(
  req: AuthRequest,
  res: Response
) {
  const userId =
    req.user?.userId;


  if (!userId) {
    return res
      .status(401)
      .json({
        status:
          "error",

        code:
          "UNAUTHORIZED",

        message:
          "Please sign in to continue.",
      });
  }


  const access =
    await getSiteAccessStatus(
      userId
    );


  return res
    .status(403)
    .json({
      status:
        "error",

      code:
        "SITE_ACCESS_REQUIRED",

      message:
        `You need ${access.tokenCost} tokens to unlock Anandam for ${access.durationDays} days.`,

      access,
    });
}


// ======================================================
// STANDARD PAID FEATURE ACCESS
// ======================================================

export async function requireSiteAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res
        .status(401)
        .json({
          status:
            "error",

          code:
            "UNAUTHORIZED",

          message:
            "Please sign in to continue.",
        });
    }


    const active =
      await hasActiveSiteAccess(
        userId
      );


    if (active) {
      return next();
    }


    return sendSiteAccessRequired(
      req,
      res
    );
  } catch (error) {
    console.error(
      "requireSiteAccess error:",
      error
    );


    return res
      .status(500)
      .json({
        status:
          "error",

        code:
          "SITE_ACCESS_CHECK_FAILED",

        message:
          "Unable to verify Anandam access.",
      });
  }
}


// ======================================================
// DETECT QUICK MOOD REQUEST
//
// QUICK:
//
// {
//   "checkinType": "QUICK",
//   "moodScore": 1-5
// }
//
// FULL mood submissions must NOT pass this check.
// ======================================================

function isQuickMoodRequest(
  req: AuthRequest
) {
  const body =
    req.body || {};


  const explicitType =
    body.checkinType
      ? String(
          body.checkinType
        )
          .trim()
          .toUpperCase()
      : null;


  // ----------------------------------------------------
// Preferred explicit QUICK value
// ----------------------------------------------------

  if (
    explicitType ===
    "QUICK"
  ) {
    return true;
  }


  // ----------------------------------------------------
// Anything explicitly marked differently is NOT quick
// ----------------------------------------------------

  if (
    explicitType &&
    explicitType !==
      "QUICK"
  ) {
    return false;
  }


  // ----------------------------------------------------
// Backwards-compatible inference
//
// Only moodScore = quick.
// Any detailed wellbeing fields = full mood check.
// ----------------------------------------------------

  return (
    body.moodScore !==
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
      undefined
  );
}


// ======================================================
// QUICK MOOD SUBMISSION OR SITE ACCESS
//
// QUICK mood is ALWAYS allowed for an authenticated user.
//
// FULL mood submission requires active 30-day access.
// ======================================================

export async function allowQuickMoodCheckinOrSiteAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res
        .status(401)
        .json({
          status:
            "error",

          code:
            "UNAUTHORIZED",

          message:
            "Please sign in to continue.",
        });
    }


    // --------------------------------------------------
    // QUICK mood is free
    // --------------------------------------------------

    if (
      isQuickMoodRequest(
        req
      )
    ) {
      return next();
    }


    // --------------------------------------------------
    // FULL mood requires site access
    // --------------------------------------------------

    const active =
      await hasActiveSiteAccess(
        userId
      );


    if (active) {
      return next();
    }


    return sendSiteAccessRequired(
      req,
      res
    );
  } catch (error) {
    console.error(
      "Mood access check error:",
      error
    );


    return res
      .status(500)
      .json({
        status:
          "error",

        code:
          "SITE_ACCESS_CHECK_FAILED",

        message:
          "Unable to verify mood check-in access.",
      });
  }
}


// ======================================================
// QUICK MOOD HISTORY OR SITE ACCESS
//
// Allows:
//
// GET /api/mood/history?type=QUICK
//
// This is useful for the post-login Quick Mood page.
//
// FULL history remains protected.
// ======================================================

export async function allowQuickMoodHistoryOrSiteAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res
        .status(401)
        .json({
          status:
            "error",

          code:
            "UNAUTHORIZED",

          message:
            "Please sign in to continue.",
        });
    }


    const rawType =
      req.query.type;


    const type =
      Array.isArray(
        rawType
      )
        ? String(
            rawType[0] || ""
          )
        : String(
            rawType || ""
          );


    // --------------------------------------------------
    // QUICK history is free
    // --------------------------------------------------

    if (
      type
        .trim()
        .toUpperCase() ===
      "QUICK"
    ) {
      return next();
    }


    // --------------------------------------------------
    // All other mood history requires access
    // --------------------------------------------------

    const active =
      await hasActiveSiteAccess(
        userId
      );


    if (active) {
      return next();
    }


    return sendSiteAccessRequired(
      req,
      res
    );
  } catch (error) {
    console.error(
      "Mood history access check error:",
      error
    );


    return res
      .status(500)
      .json({
        status:
          "error",

        code:
          "SITE_ACCESS_CHECK_FAILED",

        message:
          "Unable to verify mood history access.",
      });
  }
}


// ======================================================
// WELLBEING QUESTIONNAIRES
//
// Wellbeing is a FREE Anandam area.
//
// User must only be authenticated.
// Site-access subscription is NOT required.
//
// We keep the same exported function name so existing
// route files do not need to change.
// ======================================================

export async function allowFreeWellbeingQuestionnaireOrSiteAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res
        .status(401)
        .json({
          status:
            "error",

          code:
            "UNAUTHORIZED",

          message:
            "Please sign in to continue.",
        });
    }


    // --------------------------------------------------
    // WELLBEING IS FREE
    // --------------------------------------------------

    return next();

  } catch (error) {
    console.error(
      "Wellbeing access check error:",
      error
    );


    return res
      .status(500)
      .json({
        status:
          "error",

        code:
          "WELLBEING_ACCESS_CHECK_FAILED",

        message:
          "Unable to verify wellbeing access.",
      });
  }
}