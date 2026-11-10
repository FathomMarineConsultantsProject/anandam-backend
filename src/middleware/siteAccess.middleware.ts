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


  if (
    explicitType ===
    "QUICK"
  ) {
    return true;
  }


  if (
    explicitType &&
    explicitType !==
      "QUICK"
  ) {
    return false;
  }


  // Backwards compatibility:
  // moodScore only = QUICK.
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
// QUICK is always free for an authenticated user.
// FULL mood requires active site access.
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


    if (
      isQuickMoodRequest(
        req
      )
    ) {
      return next();
    }


    if (
      await hasActiveSiteAccess(
        userId
      )
    ) {
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
// GET /api/mood/history?type=QUICK is free.
// Any other mood history requires active site access.
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


    if (
      type
        .trim()
        .toUpperCase() ===
      "QUICK"
    ) {
      return next();
    }


    if (
      await hasActiveSiteAccess(
        userId
      )
    ) {
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
