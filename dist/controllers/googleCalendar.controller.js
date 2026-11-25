"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryGoogleCalendarSync = exports.disconnectGoogleCalendar = exports.googleCalendarCallback = exports.getGoogleCalendarConnectUrl = exports.getGoogleCalendarStatus = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const googleapis_1 = require("googleapis");
const client_1 = require("@prisma/client");
const googleCalendar_1 = require("../utils/googleCalendar");
const secretCrypto_1 = require("../utils/secretCrypto");
const prisma = new client_1.PrismaClient();
// ======================================================
// HELPERS
// ======================================================
const getString = (value) => {
    if (Array.isArray(value)) {
        return String(value[0] ?? "");
    }
    return String(value ?? "");
};
// ======================================================
// STATUS
//
// GET /api/google-calendar/status
// ======================================================
const getGoogleCalendarStatus = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const connection = await prisma
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
                connected: Boolean(connection?.isActive),
                connection: connection ?? null,
            },
        });
    }
    catch (error) {
        console.error("Google Calendar status error:", error);
        return res.status(500).json({
            error: "Unable to check Google Calendar connection",
        });
    }
};
exports.getGoogleCalendarStatus = getGoogleCalendarStatus;
// ======================================================
// GET GOOGLE LOGIN URL
//
// GET /api/google-calendar/connect-url
//
// ?timeZone=Asia/Kolkata
// ======================================================
const getGoogleCalendarConnectUrl = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const user = await prisma.user.findUnique({
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
        const requestedTimeZone = getString(req.query.timeZone).trim() || "UTC";
        if (!(0, googleCalendar_1.isValidTimeZone)(requestedTimeZone)) {
            return res.status(400).json({
                error: "Invalid timezone",
            });
        }
        const stateSecret = process.env
            .GOOGLE_OAUTH_STATE_SECRET;
        if (!stateSecret) {
            throw new Error("GOOGLE_OAUTH_STATE_SECRET is missing");
        }
        const state = jsonwebtoken_1.default.sign({
            userId,
            timeZone: requestedTimeZone,
        }, stateSecret, {
            expiresIn: "10m",
        });
        const authUrl = (0, googleCalendar_1.createGoogleAuthorizationUrl)(state, user.email);
        return res.status(200).json({
            status: "success",
            data: {
                authUrl,
                timeZone: requestedTimeZone,
            },
        });
    }
    catch (error) {
        console.error("Google connect URL error:", error);
        return res.status(500).json({
            error: "Unable to start Google Calendar connection",
        });
    }
};
exports.getGoogleCalendarConnectUrl = getGoogleCalendarConnectUrl;
// ======================================================
// GOOGLE CALLBACK
//
// GET /api/google-calendar/callback
//
// IMPORTANT:
// NO authenticateToken middleware.
// Google redirects directly here.
// ======================================================
const googleCalendarCallback = async (req, res) => {
    try {
        const code = getString(req.query.code);
        const state = getString(req.query.state);
        if (!code ||
            !state) {
            return res.status(400).send("Missing Google authorization information.");
        }
        const stateSecret = process.env
            .GOOGLE_OAUTH_STATE_SECRET;
        if (!stateSecret) {
            throw new Error("GOOGLE_OAUTH_STATE_SECRET is missing");
        }
        const decoded = jsonwebtoken_1.default.verify(state, stateSecret);
        const oauthClient = (0, googleCalendar_1.createGoogleOAuthClient)();
        const { tokens, } = await oauthClient.getToken(code);
        oauthClient.setCredentials(tokens);
        // Get the actual Google account
        const oauth2 = googleapis_1.google.oauth2({
            version: "v2",
            auth: oauthClient,
        });
        const profile = await oauth2.userinfo.get();
        const googleEmail = profile.data.email ?? null;
        const existing = await prisma
            .googleCalendarConnection
            .findUnique({
            where: {
                userId: decoded.userId,
            },
        });
        /*
          Google may not always send another refresh token
          when reconnecting.
  
          If we already stored one, keep it.
        */
        let encryptedRefreshToken = existing
            ?.refreshTokenEncrypted;
        if (tokens.refresh_token) {
            encryptedRefreshToken =
                (0, secretCrypto_1.encryptSecret)(tokens.refresh_token);
        }
        if (!encryptedRefreshToken) {
            return res.status(400).send("Google did not provide a refresh token. Please reconnect Google Calendar.");
        }
        await prisma
            .googleCalendarConnection
            .upsert({
            where: {
                userId: decoded.userId,
            },
            update: {
                googleEmail,
                calendarId: "primary",
                timeZone: decoded.timeZone,
                refreshTokenEncrypted: encryptedRefreshToken,
                scopes: tokens.scope
                    ?.split(" ")
                    .filter(Boolean) ??
                    googleCalendar_1.GOOGLE_SCOPES,
                isActive: true,
            },
            create: {
                userId: decoded.userId,
                googleEmail,
                calendarId: "primary",
                timeZone: decoded.timeZone,
                refreshTokenEncrypted: encryptedRefreshToken,
                scopes: tokens.scope
                    ?.split(" ")
                    .filter(Boolean) ??
                    googleCalendar_1.GOOGLE_SCOPES,
                isActive: true,
            },
        });
        const frontendUrl = process.env.FRONTEND_URL ||
            "http://localhost:5173";
        return res.redirect(`${frontendUrl}?googleCalendar=connected`);
    }
    catch (error) {
        console.error("Google Calendar callback error:", error);
        const frontendUrl = process.env.FRONTEND_URL ||
            "http://localhost:5173";
        return res.redirect(`${frontendUrl}?googleCalendar=error`);
    }
};
exports.googleCalendarCallback = googleCalendarCallback;
// ======================================================
// DISCONNECT
//
// POST /api/google-calendar/disconnect
// ======================================================
const disconnectGoogleCalendar = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const connection = await prisma
            .googleCalendarConnection
            .findUnique({
            where: {
                userId,
            },
        });
        if (!connection) {
            return res.status(200).json({
                status: "success",
                message: "Google Calendar is already disconnected.",
            });
        }
        // Try to revoke token from Google
        try {
            const oauthClient = (0, googleCalendar_1.createGoogleOAuthClient)();
            const refreshToken = (0, secretCrypto_1.decryptSecret)(connection
                .refreshTokenEncrypted);
            await oauthClient.revokeToken(refreshToken);
        }
        catch (error) {
            console.warn("Google token revoke warning:", error);
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
                    googleSyncStatus: "NOT_CONNECTED",
                    googleSyncError: null,
                    googleSyncedAt: null,
                },
            }),
        ]);
        return res.status(200).json({
            status: "success",
            message: "Google Calendar disconnected successfully.",
        });
    }
    catch (error) {
        console.error("Google disconnect error:", error);
        return res.status(500).json({
            error: "Unable to disconnect Google Calendar",
        });
    }
};
exports.disconnectGoogleCalendar = disconnectGoogleCalendar;
// ======================================================
// MANUAL RETRY
//
// POST /api/google-calendar/sync/:activityId
// ======================================================
const retryGoogleCalendarSync = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const activityId = Array.isArray(req.params.activityId)
            ? req.params.activityId[0]
            : req.params.activityId;
        if (!userId ||
            !activityId) {
            return res.status(400).json({
                error: "Invalid request",
            });
        }
        const result = await (0, googleCalendar_1.syncActivityToGoogleCalendar)(userId, activityId);
        return res.status(200).json({
            status: "success",
            data: result,
        });
    }
    catch (error) {
        console.error("Google Calendar retry error:", error);
        return res.status(502).json({
            status: "error",
            error: "Google Calendar sync failed.",
        });
    }
};
exports.retryGoogleCalendarSync = retryGoogleCalendarSync;
