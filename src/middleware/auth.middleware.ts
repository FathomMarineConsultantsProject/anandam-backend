import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


// ======================================================
// AUTH REQUEST TYPE
// ======================================================

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    sessionId: string;
  };
}


// ======================================================
// AUTHENTICATE ACCESS TOKEN
// ======================================================

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;


    // --------------------------------------------------
    // No Authorization header
    // --------------------------------------------------

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        code: "ACCESS_TOKEN_MISSING",
        message: "Please sign in to continue.",
        action: "LOGIN_REQUIRED",
        shouldLogout: true,
      });
    }


    // --------------------------------------------------
    // Validate Bearer format
    // --------------------------------------------------

    const [scheme, token] =
      authHeader.split(" ");


    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        status: "error",
        code: "ACCESS_TOKEN_INVALID",
        message:
          "Your login session is invalid. Please sign in again.",
        action: "LOGIN_REQUIRED",
        shouldLogout: true,
      });
    }


    // --------------------------------------------------
    // Verify access token
    // --------------------------------------------------

    let decoded: {
      userId: string;
      sessionId: string;
    };


    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET as string
      ) as {
        userId: string;
        sessionId: string;
      };

    } catch (error) {

      // ----------------------------------------------
      // Token expired normally after 6 hours
      // ----------------------------------------------

      if (
        error instanceof jwt.TokenExpiredError
      ) {
        return res.status(401).json({
          status: "error",
          code: "ACCESS_TOKEN_EXPIRED",
          message:
            "Your session has expired. Refresh your session to continue.",
          action: "REFRESH_ACCESS_TOKEN",
          shouldRefresh: true,
        });
      }


      // ----------------------------------------------
      // Token invalid/tampered
      // ----------------------------------------------

      return res.status(401).json({
        status: "error",
        code: "ACCESS_TOKEN_INVALID",
        message:
          "Your login session is invalid. Please sign in again.",
        action: "LOGIN_REQUIRED",
        shouldLogout: true,
      });
    }


    // --------------------------------------------------
    // Validate token payload
    // --------------------------------------------------

    if (
      !decoded.userId ||
      !decoded.sessionId
    ) {
      return res.status(401).json({
        status: "error",
        code: "SESSION_INVALID",
        message:
          "Your login session is no longer valid. Please sign in again.",
        action: "LOGIN_REQUIRED",
        shouldLogout: true,
      });
    }


    // --------------------------------------------------
    // Check server-side login session
    //
    // This makes logout actually revoke the access token.
    // --------------------------------------------------

    const session =
      await prisma.refreshToken.findUnique({
        where: {
          id: decoded.sessionId,
        },
      });


    if (
      !session ||
      session.userId !== decoded.userId
    ) {
      return res.status(401).json({
        status: "error",
        code: "SESSION_EXPIRED",
        message:
          "You have been logged out or your session has expired. Please sign in again.",
        action: "LOGIN_REQUIRED",
        shouldLogout: true,
      });
    }


    // --------------------------------------------------
    // Check refresh/login session expiry
    // --------------------------------------------------

    if (
      session.expiresAt.getTime() <=
      Date.now()
    ) {
      await prisma.refreshToken.deleteMany({
        where: {
          id: session.id,
        },
      });


      return res.status(401).json({
        status: "error",
        code: "SESSION_EXPIRED",
        message:
          "Your login session has expired. Please sign in again.",
        action: "LOGIN_REQUIRED",
        shouldLogout: true,
      });
    }


    // --------------------------------------------------
    // Attach authenticated user
    // --------------------------------------------------

    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
    };


    return next();

  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );


    return res.status(500).json({
      status: "error",
      code: "AUTHENTICATION_ERROR",
      message:
        "Unable to verify your login session.",
    });
  }
};