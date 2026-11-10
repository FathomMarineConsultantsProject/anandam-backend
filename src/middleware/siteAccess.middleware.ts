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
// SITE ACCESS REQUIRED RESPONSE
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
// REQUIRE ACTIVE 30-DAY SITE ACCESS
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
  } catch (
    error
  ) {
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