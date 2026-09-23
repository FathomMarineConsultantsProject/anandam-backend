import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { PrismaClient } from "@prisma/client";

import { AuthRequest } from "../middleware/auth.middleware";

import {
  GOOGLE_SCOPES,
  createGoogleOAuthClient,
  createGoogleAuthorizationUrl,
  isValidTimeZone,
  syncActivityToGoogleCalendar,
} from "../utils/googleCalendar";

import {
  encryptSecret,
  decryptSecret,
} from "../utils/secretCrypto";


const prisma = new PrismaClient();


// ======================================================
// HELPERS
// ======================================================

const getString = (
  value: unknown
): string => {

  if (Array.isArray(value)) {
    return String(
      value[0] ?? ""
    );
  }

  return String(
    value ?? ""
  );
};

// ======================================================
// STATUS
//
// GET /api/google-calendar/status
// ======================================================

export const getGoogleCalendarStatus =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }


      const connection =
        await prisma
          .googleCalendarConnection
          .findUnique({
            where: {
              userId,
            },

            select: {
              googleEmail: true,
              calendarId: true,
              timeZone: true,
              isActive: true,
              emailReminderMinutes: true,
              popupReminderMinutes: true,
              connectedAt: true,
            },
          });


      return res.status(200).json({
        status: "success",

        data: {
          connected:
            Boolean(
              connection?.isActive
            ),

          connection:
            connection ?? null,
        },
      });

    } catch (error) {

      console.error(
        "Google Calendar status error:",
        error
      );


      return res.status(500).json({
        error:
          "Unable to check Google Calendar connection",
      });
    }
  };


// ======================================================
// GET GOOGLE LOGIN URL
//
// GET /api/google-calendar/connect-url
//
// ?timeZone=Asia/Kolkata
// ======================================================

export const getGoogleCalendarConnectUrl =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }


      const user =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            email: true,
          },
        });


      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }


      const requestedTimeZone =
        getString(
          req.query.timeZone
        ).trim() || "UTC";


      if (
        !isValidTimeZone(
          requestedTimeZone
        )
      ) {
        return res.status(400).json({
          error: "Invalid timezone",
        });
      }


      const stateSecret =
        process.env
          .GOOGLE_OAUTH_STATE_SECRET;


      if (!stateSecret) {
        throw new Error(
          "GOOGLE_OAUTH_STATE_SECRET is missing"
        );
      }


      const state =
        jwt.sign(
          {
            userId,
            timeZone:
              requestedTimeZone,
          },

          stateSecret,

          {
            expiresIn: "10m",
          }
        );


      const authUrl =
        createGoogleAuthorizationUrl(
          state,
          user.email
        );


      return res.status(200).json({
        status: "success",

        data: {
          authUrl,
          timeZone:
            requestedTimeZone,
        },
      });

    } catch (error) {

      console.error(
        "Google connect URL error:",
        error
      );


      return res.status(500).json({
        error:
          "Unable to start Google Calendar connection",
      });
    }
  };


// ======================================================
// GOOGLE CALLBACK
//
// GET /api/google-calendar/callback
//
// IMPORTANT:
// NO authenticateToken middleware.
// Google redirects directly here.
// ======================================================

export const googleCalendarCallback =
  async (
    req: Request,
    res: Response
  ): Promise<any> => {

    try {

      const code =
        getString(
          req.query.code
        );

      const state =
        getString(
          req.query.state
        );


      if (
        !code ||
        !state
      ) {
        return res.status(400).send(
          "Missing Google authorization information."
        );
      }


      const stateSecret =
        process.env
          .GOOGLE_OAUTH_STATE_SECRET;


      if (!stateSecret) {
        throw new Error(
          "GOOGLE_OAUTH_STATE_SECRET is missing"
        );
      }


      const decoded =
        jwt.verify(
          state,
          stateSecret
        ) as {
          userId: string;
          timeZone: string;
        };


      const oauthClient =
        createGoogleOAuthClient();


      const {
        tokens,
      } =
        await oauthClient.getToken(
          code
        );


      oauthClient.setCredentials(
        tokens
      );


      // Get the actual Google account
      const oauth2 =
        google.oauth2({
          version: "v2",
          auth: oauthClient,
        });


      const profile =
        await oauth2.userinfo.get();


      const googleEmail =
        profile.data.email ?? null;


      const existing =
        await prisma
          .googleCalendarConnection
          .findUnique({
            where: {
              userId:
                decoded.userId,
            },
          });


      /*
        Google may not always send another refresh token
        when reconnecting.

        If we already stored one, keep it.
      */

      let encryptedRefreshToken =
        existing
          ?.refreshTokenEncrypted;


      if (
        tokens.refresh_token
      ) {
        encryptedRefreshToken =
          encryptSecret(
            tokens.refresh_token
          );
      }


      if (!encryptedRefreshToken) {

        return res.status(400).send(
          "Google did not provide a refresh token. Please reconnect Google Calendar."
        );
      }


      await prisma
        .googleCalendarConnection
        .upsert({

          where: {
            userId:
              decoded.userId,
          },

          update: {
            googleEmail,

            calendarId:
              "primary",

            timeZone:
              decoded.timeZone,

            refreshTokenEncrypted:
              encryptedRefreshToken,

            scopes:
              tokens.scope
                ?.split(" ")
                .filter(Boolean) ??
              GOOGLE_SCOPES,

            isActive:
              true,
          },

          create: {
            userId:
              decoded.userId,

            googleEmail,

            calendarId:
              "primary",

            timeZone:
              decoded.timeZone,

            refreshTokenEncrypted:
              encryptedRefreshToken,

            scopes:
              tokens.scope
                ?.split(" ")
                .filter(Boolean) ??
              GOOGLE_SCOPES,

            isActive:
              true,
          },
        });


      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";


      return res.redirect(
        `${frontendUrl}?googleCalendar=connected`
      );

    } catch (error) {

      console.error(
        "Google Calendar callback error:",
        error
      );


      const frontendUrl =
        process.env.FRONTEND_URL ||
        "http://localhost:5173";


      return res.redirect(
        `${frontendUrl}?googleCalendar=error`
      );
    }
  };


// ======================================================
// DISCONNECT
//
// POST /api/google-calendar/disconnect
// ======================================================

export const disconnectGoogleCalendar =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
        });
      }


      const connection =
        await prisma
          .googleCalendarConnection
          .findUnique({
            where: {
              userId,
            },
          });


      if (!connection) {

        return res.status(200).json({
          status: "success",

          message:
            "Google Calendar is already disconnected.",
        });
      }


      // Try to revoke token from Google
      try {

        const oauthClient =
          createGoogleOAuthClient();


        const refreshToken =
          decryptSecret(
            connection
              .refreshTokenEncrypted
          );


        await oauthClient.revokeToken(
          refreshToken
        );

      } catch (error) {

        console.warn(
          "Google token revoke warning:",
          error
        );
      }


      await prisma.$transaction([

        prisma
          .googleCalendarConnection
          .delete({
            where: {
              userId,
            },
          }),

        prisma.activity.updateMany({
          where: {
            dailyPlan: {
              userId,
            },
          },

          data: {
            googleEventId: null,

            googleCalendarId: null,

            googleSyncStatus:
              "NOT_CONNECTED",

            googleSyncError: null,

            googleSyncedAt: null,
          },
        }),

      ]);


      return res.status(200).json({
        status: "success",

        message:
          "Google Calendar disconnected successfully.",
      });

    } catch (error) {

      console.error(
        "Google disconnect error:",
        error
      );


      return res.status(500).json({
        error:
          "Unable to disconnect Google Calendar",
      });
    }
  };


// ======================================================
// MANUAL RETRY
//
// POST /api/google-calendar/sync/:activityId
// ======================================================

export const retryGoogleCalendarSync =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      const activityId =
        Array.isArray(
          req.params.activityId
        )
          ? req.params.activityId[0]
          : req.params.activityId;


      if (
        !userId ||
        !activityId
      ) {
        return res.status(400).json({
          error: "Invalid request",
        });
      }


      const result =
        await syncActivityToGoogleCalendar(
          userId,
          activityId
        );


      return res.status(200).json({
        status: "success",

        data: result,
      });

    } catch (error) {

      console.error(
        "Google Calendar retry error:",
        error
      );


      return res.status(502).json({
        status: "error",

        error:
          "Google Calendar sync failed.",
      });
    }
  };