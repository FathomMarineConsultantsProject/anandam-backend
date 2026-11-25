"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGoogleEventForActivity = exports.syncActivityToGoogleCalendar = exports.isValidTimeZone = exports.createGoogleAuthorizationUrl = exports.createGoogleOAuthClient = exports.GOOGLE_SCOPES = void 0;
const googleapis_1 = require("googleapis");
const client_1 = require("@prisma/client");
const secretCrypto_1 = require("./secretCrypto");
const prisma = new client_1.PrismaClient();
// ======================================================
// GOOGLE SCOPES
// ======================================================
exports.GOOGLE_SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar.events",
];
// ======================================================
// OAUTH CLIENT
// ======================================================
const createGoogleOAuthClient = () => {
    return new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
};
exports.createGoogleOAuthClient = createGoogleOAuthClient;
// ======================================================
// AUTHORIZATION URL
// ======================================================
const createGoogleAuthorizationUrl = (state, loginHint) => {
    const oauthClient = (0, exports.createGoogleOAuthClient)();
    return oauthClient.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: exports.GOOGLE_SCOPES,
        include_granted_scopes: true,
        state,
        ...(loginHint
            ? {
                login_hint: loginHint,
            }
            : {}),
    });
};
exports.createGoogleAuthorizationUrl = createGoogleAuthorizationUrl;
// ======================================================
// TIMEZONE VALIDATION
// ======================================================
const isValidTimeZone = (timeZone) => {
    try {
        Intl.DateTimeFormat("en-US", {
            timeZone,
        }).format();
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidTimeZone = isValidTimeZone;
// ======================================================
// WALL CLOCK HELPERS
// ======================================================
const pad = (value) => String(value)
    .padStart(2, "0");
const toWallClockDateTime = (date) => {
    return (`${date.getUTCFullYear()}-` +
        `${pad(date.getUTCMonth() + 1)}-` +
        `${pad(date.getUTCDate())}` +
        `T` +
        `${pad(date.getUTCHours())}:` +
        `${pad(date.getUTCMinutes())}:00`);
};
// ======================================================
// BUILD GOOGLE EVENT
// ======================================================
const buildGoogleEvent = (activity, connectionTimeZone, emailReminderMinutes, popupReminderMinutes) => {
    const endTime = new Date(activity.startTime.getTime() +
        activity.durationMinutes *
            60 *
            1000);
    const timeZone = activity.timeZone ||
        connectionTimeZone ||
        "UTC";
    return {
        summary: activity.title,
        description: [
            activity.note,
            `Category: ${activity.category}`,
            "Created from Anandam Day Planner",
        ]
            .filter(Boolean)
            .join("\n\n"),
        start: {
            dateTime: toWallClockDateTime(activity.startTime),
            timeZone,
        },
        end: {
            dateTime: toWallClockDateTime(endTime),
            timeZone,
        },
        reminders: {
            useDefault: false,
            overrides: [
                {
                    method: "email",
                    minutes: emailReminderMinutes,
                },
                {
                    method: "popup",
                    minutes: popupReminderMinutes,
                },
            ],
        },
        extendedProperties: {
            private: {
                anandamActivityId: activity.id,
            },
        },
    };
};
// ======================================================
// GET AUTHORIZED USER CALENDAR
// ======================================================
const getAuthorizedCalendar = async (userId) => {
    const connection = await prisma
        .googleCalendarConnection
        .findUnique({
        where: {
            userId,
        },
    });
    if (!connection ||
        !connection.isActive) {
        return null;
    }
    const oauthClient = (0, exports.createGoogleOAuthClient)();
    oauthClient.setCredentials({
        refresh_token: (0, secretCrypto_1.decryptSecret)(connection
            .refreshTokenEncrypted),
    });
    const calendar = googleapis_1.google.calendar({
        version: "v3",
        auth: oauthClient,
    });
    return {
        calendar,
        connection,
    };
};
// ======================================================
// CREATE / UPDATE GOOGLE EVENT
// ======================================================
const syncActivityToGoogleCalendar = async (userId, activityId) => {
    const activity = await prisma.activity.findFirst({
        where: {
            id: activityId,
            dailyPlan: {
                userId,
            },
        },
    });
    if (!activity) {
        throw new Error("Activity not found");
    }
    const googleData = await getAuthorizedCalendar(userId);
    if (!googleData) {
        await prisma.activity.update({
            where: {
                id: activity.id,
            },
            data: {
                googleSyncStatus: "NOT_CONNECTED",
                googleSyncError: null,
            },
        });
        return {
            connected: false,
            synced: false,
            code: "GOOGLE_CALENDAR_NOT_CONNECTED",
        };
    }
    const { calendar, connection, } = googleData;
    const event = buildGoogleEvent(activity, connection.timeZone, connection.emailReminderMinutes, connection.popupReminderMinutes);
    try {
        let googleEvent;
        // Existing event -> update
        if (activity.googleEventId) {
            try {
                const result = await calendar.events.update({
                    calendarId: activity.googleCalendarId ||
                        connection.calendarId,
                    eventId: activity.googleEventId,
                    requestBody: event,
                    sendUpdates: "none",
                });
                googleEvent =
                    result.data;
            }
            catch (error) {
                const status = error?.response?.status;
                if (status !== 404 &&
                    status !== 410) {
                    throw error;
                }
                const created = await calendar.events.insert({
                    calendarId: connection.calendarId,
                    requestBody: event,
                    sendUpdates: "none",
                });
                googleEvent =
                    created.data;
            }
        }
        else {
            // No event yet -> create
            const created = await calendar.events.insert({
                calendarId: connection.calendarId,
                requestBody: event,
                sendUpdates: "none",
            });
            googleEvent =
                created.data;
        }
        await prisma.activity.update({
            where: {
                id: activity.id,
            },
            data: {
                googleEventId: googleEvent.id ||
                    null,
                googleCalendarId: connection.calendarId,
                googleSyncStatus: "SYNCED",
                googleSyncError: null,
                googleSyncedAt: new Date(),
            },
        });
        return {
            connected: true,
            synced: true,
            eventId: googleEvent.id,
            htmlLink: googleEvent.htmlLink,
            googleEmail: connection.googleEmail,
        };
    }
    catch (error) {
        const message = error?.response
            ?.data?.error?.message ||
            error?.message ||
            "Google Calendar synchronization failed";
        await prisma.activity.update({
            where: {
                id: activity.id,
            },
            data: {
                googleSyncStatus: "FAILED",
                googleSyncError: message,
            },
        });
        console.error("Google Calendar sync error:", message);
        throw error;
    }
};
exports.syncActivityToGoogleCalendar = syncActivityToGoogleCalendar;
// ======================================================
// DELETE GOOGLE EVENT
// ======================================================
const deleteGoogleEventForActivity = async (userId, activityId) => {
    const activity = await prisma.activity.findFirst({
        where: {
            id: activityId,
            dailyPlan: {
                userId,
            },
        },
    });
    if (!activity) {
        throw new Error("Activity not found");
    }
    if (!activity.googleEventId) {
        return {
            deleted: false,
            code: "NO_GOOGLE_EVENT",
        };
    }
    const googleData = await getAuthorizedCalendar(userId);
    if (!googleData) {
        return {
            deleted: false,
            code: "GOOGLE_CALENDAR_NOT_CONNECTED",
        };
    }
    try {
        await googleData
            .calendar
            .events
            .delete({
            calendarId: activity.googleCalendarId ||
                googleData.connection
                    .calendarId,
            eventId: activity.googleEventId,
            sendUpdates: "none",
        });
        return {
            deleted: true,
        };
    }
    catch (error) {
        if (error?.response?.status ===
            404 ||
            error?.response?.status ===
                410) {
            return {
                deleted: true,
            };
        }
        throw error;
    }
};
exports.deleteGoogleEventForActivity = deleteGoogleEventForActivity;
