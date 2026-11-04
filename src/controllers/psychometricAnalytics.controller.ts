import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  getPsychometricAnalysis,
} from "../services/psychometricAnalytics.service";

import {
  generatePsychometricReport,
} from "../services/psychometricReport.service";


type AuthenticatedRequest =
  Request & {
    userId?: string;

    user?: {
      id?: string;

      userId?: string;

      role?: string;
    };
  };


function getUserId(
  req:
    AuthenticatedRequest
) {
  return (
    req.userId ||
    req.user?.userId ||
    req.user?.id ||
    null
  );
}


function requireUserId(
  req:
    AuthenticatedRequest
) {
  const userId =
    getUserId(
      req
    );


  if (!userId) {
    const error =
      new Error(
        "Authentication required."
      ) as Error & {
        statusCode?: number;
      };


    error.statusCode =
      401;


    throw error;
  }


  return userId;
}


function asString(
  value:
    | string
    | string[]
    | undefined
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ||
      ""
    );
  }


  return (
    value ||
    ""
  );
}


// ======================================================
// GET RESULT ANALYTICS
//
// GET
// /api/psychometrics/attempts/:attemptId/analysis
// ======================================================

export async function getPsychometricAnalysisController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      requireUserId(
        req as AuthenticatedRequest
      );


    const attemptId =
      asString(
        req.params
          .attemptId
      );


    const analysis =
      await getPsychometricAnalysis(
        userId,
        attemptId
      );


    return res
      .status(
        200
      )
      .json({
        analysis,
      });
  } catch (
    error
  ) {
    next(
      error
    );
  }
}


// ======================================================
// DOWNLOAD PDF REPORT
//
// GET
// /api/psychometrics/attempts/:attemptId/report.pdf
// ======================================================

export async function downloadPsychometricReportController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      requireUserId(
        req as AuthenticatedRequest
      );


    const attemptId =
      asString(
        req.params
          .attemptId
      );


    const report =
      await generatePsychometricReport(
        userId,
        attemptId
      );


    res.setHeader(
      "Content-Type",
      "application/pdf"
    );


    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.filename}"`
    );


    res.setHeader(
      "Content-Length",
      String(
        report.buffer
          .length
      )
    );


    return res
      .status(
        200
      )
      .send(
        report.buffer
      );
  } catch (
    error
  ) {
    next(
      error
    );
  }
}