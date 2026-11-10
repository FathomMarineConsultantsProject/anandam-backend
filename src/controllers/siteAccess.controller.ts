import {
  Request,
  Response,
} from "express";

import {
  AuthRequest,
} from "../middleware/auth.middleware";

import {
  activateSiteAccess,
  getSiteAccessStatus,
  SiteAccessError,
} from "../services/siteAccess.service";


// ======================================================
// GET MY SITE ACCESS
//
// GET /api/site-access/me
// ======================================================

export async function getMySiteAccess(
  req: Request,
  res: Response
) {
  try {
    const userId =
      (
        req as AuthRequest
      )
        .user
        ?.userId;


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
      .status(200)
      .json({
        status:
          "success",

        access,
      });
  } catch (error) {
    console.error(
      "getMySiteAccess error:",
      error
    );


    if (
      error instanceof
      SiteAccessError
    ) {
      return res
        .status(
          error.statusCode
        )
        .json({
          status:
            "error",

          code:
            error.code,

          message:
            error.message,

          ...(
            error.details ||
            {}
          ),
        });
    }


    return res
      .status(500)
      .json({
        status:
          "error",

        code:
          "SITE_ACCESS_LOAD_FAILED",

        message:
          "Unable to load Anandam access information.",
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

export async function activateMySiteAccess(
  req: Request,
  res: Response
) {
  try {
    const userId =
      (
        req as AuthRequest
      )
        .user
        ?.userId;


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
      await activateSiteAccess(
        userId,
        req.body?.tokenAmount
      );


    return res
      .status(200)
      .json({
        status:
          "success",

        message:
          access.accessType ===
          "ROLE_BYPASS"
            ? "Your account has unrestricted access."
            : "Anandam access activated successfully.",

        access,
      });
  } catch (error) {
    console.error(
      "activateMySiteAccess error:",
      error
    );


    if (
      error instanceof
      SiteAccessError
    ) {
      return res
        .status(
          error.statusCode
        )
        .json({
          status:
            "error",

          code:
            error.code,

          message:
            error.message,

          ...(
            error.details ||
            {}
          ),
        });
    }


    return res
      .status(500)
      .json({
        status:
          "error",

        code:
          "SITE_ACCESS_ACTIVATION_FAILED",

        message:
          "Unable to activate Anandam access.",
      });
  }
}
