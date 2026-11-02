import {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  PsychometricSectionCode,
} from "@prisma/client";

import {
  getPsychometricAttempt,
  getPsychometricHistory,
  getPsychometricResult,
  getPsychometricTest,
  listPsychometricTests,
  savePsychometricAnswers,
  startPsychometricAttempt,
  startPsychometricSection,
  submitPsychometricAttempt,
  submitPsychometricSection,
} from "../services/psychometric.service";


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
  req: AuthenticatedRequest
) {
  return (
    req.userId ||
    req.user?.userId ||
    req.user?.id ||
    null
  );
}


function requireUserId(
  req: AuthenticatedRequest
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
  value: string | string[] | undefined
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value[0] || "";
  }

  return value || "";
}


export async function listPsychometricTestsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      requireUserId(
        req as AuthenticatedRequest
      );

    const result =
      await listPsychometricTests(
        userId
      );

    return res.status(200).json(
      result
    );
  } catch (error) {
    next(error);
  }
}


export async function getPsychometricTestController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      requireUserId(
        req as AuthenticatedRequest
      );

    const code =
      asString(
        req.params.code
      );

    const result =
      await getPsychometricTest(
        userId,
        code
      );

    return res.status(200).json(
      result
    );
  } catch (error) {
    next(error);
  }
}


export async function startPsychometricAttemptController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      requireUserId(
        req as AuthenticatedRequest
      );

    const code =
      asString(
        req.params.code
      );

    const attempt =
      await startPsychometricAttempt(
        userId,
        code
      );

    return res.status(201).json({
      attempt,
    });
  } catch (error) {
    next(error);
  }
}


export async function getPsychometricAttemptController(
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
        req.params.attemptId
      );

    const attempt =
      await getPsychometricAttempt(
        userId,
        attemptId
      );

    return res.status(200).json({
      attempt,
    });
  } catch (error) {
    next(error);
  }
}


export async function savePsychometricAnswersController(
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
        req.params.attemptId
      );

    const answers =
      Array.isArray(
        req.body?.answers
      )
        ? req.body.answers
        : [];

    if (
      answers.length === 0
    ) {
      return res.status(400).json({
        message:
          "At least one answer is required.",
      });
    }

    const result =
      await savePsychometricAnswers(
        userId,
        attemptId,
        answers
      );

    return res.status(200).json(
      result
    );
  } catch (error) {
    next(error);
  }
}


export async function startPsychometricSectionController(
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
        req.params.attemptId
      );

    const sectionCode =
      asString(
        req.params.sectionCode
      ).toUpperCase() as PsychometricSectionCode;

    if (
      !Object.values(
        PsychometricSectionCode
      ).includes(
        sectionCode
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid section code.",
      });
    }

    const result =
      await startPsychometricSection(
        userId,
        attemptId,
        sectionCode
      );

    return res.status(200).json(
      result
    );
  } catch (error) {
    next(error);
  }
}


export async function submitPsychometricSectionController(
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
        req.params.attemptId
      );

    const sectionCode =
      asString(
        req.params.sectionCode
      ).toUpperCase() as PsychometricSectionCode;

    if (
      !Object.values(
        PsychometricSectionCode
      ).includes(
        sectionCode
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid section code.",
      });
    }

    const result =
      await submitPsychometricSection(
        userId,
        attemptId,
        sectionCode
      );

    return res.status(200).json(
      result
    );
  } catch (error) {
    next(error);
  }
}


export async function submitPsychometricAttemptController(
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
        req.params.attemptId
      );

    const result =
      await submitPsychometricAttempt(
        userId,
        attemptId
      );

    return res.status(200).json(
      result
    );
  } catch (error) {
    next(error);
  }
}


export async function getPsychometricResultController(
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
        req.params.attemptId
      );

    const result =
      await getPsychometricResult(
        userId,
        attemptId
      );

    return res.status(200).json({
      result,
    });
  } catch (error) {
    next(error);
  }
}


export async function getPsychometricHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId =
      requireUserId(
        req as AuthenticatedRequest
      );

    const history =
      await getPsychometricHistory(
        userId
      );

    return res.status(200).json({
      history,
    });
  } catch (error) {
    next(error);
  }
}
