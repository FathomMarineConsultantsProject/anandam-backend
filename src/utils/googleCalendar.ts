import {
  google,
  calendar_v3,
} from "googleapis";

import {
  PrismaClient,
} from "@prisma/client";

import {
  decryptSecret,
} from "./secretCrypto";


const prisma =
  new PrismaClient();


// ======================================================
// GOOGLE SCOPES
// ======================================================

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
];


// ======================================================
// OAUTH CLIENT
// ======================================================

export const createGoogleOAuthClient = () => {

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};


// ======================================================
// AUTHORIZATION URL
// ======================================================

export const createGoogleAuthorizationUrl = (
  state: string,
  loginHint?: string
) => {

  const oauthClient =
    createGoogleOAuthClient();


  return oauthClient.generateAuthUrl({
    access_type:
      "offline",

    prompt:
      "consent",

    scope:
      GOOGLE_SCOPES,

    include_granted_scopes:
      true,

    state,

    ...(loginHint
      ? {
          login_hint:
            loginHint,
        }
      : {}),
  });
};


// ======================================================
// TIMEZONE VALIDATION
// ======================================================

export const isValidTimeZone = (
  timeZone: string
): boolean => {

  try {

    Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
      }
    ).format();


    return true;

  } catch {

    return false;
  }
};


// ======================================================
// WALL CLOCK HELPERS
// ======================================================

const pad = (
  value: number
): string =>
  String(value)
    .padStart(
      2,
      "0"
    );


const toWallClockDateTime = (
  date: Date
): string => {

  return (
    `${date.getUTCFullYear()}-` +
    `${pad(
      date.getUTCMonth() + 1
    )}-` +
    `${pad(
      date.getUTCDate()
    )}` +
    `T` +
    `${pad(
      date.getUTCHours()
    )}:` +
    `${pad(
      date.getUTCMinutes()
    )}:00`
  );
};


// ======================================================
// BUILD GOOGLE EVENT
// ======================================================

const buildGoogleEvent = (
  activity: {
    id: string;
    title: string;
    category: string;
    note: string | null;
    startTime: Date;
    durationMinutes: number;
    timeZone: string | null;
  },

  connectionTimeZone: string,

  emailReminderMinutes: number,

  popupReminderMinutes: number
): calendar_v3.Schema$Event => {

  const endTime =
    new Date(
      activity.startTime.getTime() +
      activity.durationMinutes *
        60 *
        1000
    );


  const timeZone =
    activity.timeZone ||
    connectionTimeZone ||
    "UTC";


  return {

    summary:
      activity.title,


    description:
      [
        activity.note,

        `Category: ${activity.category}`,

        "Created from Anandam Day Planner",
      ]
        .filter(Boolean)
        .join("\n\n"),


    start: {
      dateTime:
        toWallClockDateTime(
          activity.startTime
        ),

      timeZone,
    },


    end: {
      dateTime:
        toWallClockDateTime(
          endTime
        ),

      timeZone,
    },


    reminders: {
      useDefault:
        false,

      overrides: [
        {
          method:
            "email",

          minutes:
            emailReminderMinutes,
        },

        {
          method:
            "popup",

          minutes:
            popupReminderMinutes,
        },
      ],
    },


    extendedProperties: {
      private: {
        anandamActivityId:
          activity.id,
      },
    },
  };
};


// ======================================================
// GET AUTHORIZED USER CALENDAR
// ======================================================

const getAuthorizedCalendar =
  async (
    userId: string
  ) => {

    const connection =
      await prisma
        .googleCalendarConnection
        .findUnique({
          where: {
            userId,
          },
        });


    if (
      !connection ||
      !connection.isActive
    ) {
      return null;
    }


    const oauthClient =
      createGoogleOAuthClient();


    oauthClient.setCredentials({
      refresh_token:
        decryptSecret(
          connection
            .refreshTokenEncrypted
        ),
    });


    const calendar =
      google.calendar({
        version:
          "v3",

        auth:
          oauthClient,
      });


    return {
      calendar,
      connection,
    };
  };


// ======================================================
// CREATE / UPDATE GOOGLE EVENT
// ======================================================

export const syncActivityToGoogleCalendar =
  async (
    userId: string,
    activityId: string
  ) => {

    const activity =
      await prisma.activity.findFirst({
        where: {
          id:
            activityId,

          dailyPlan: {
            userId,
          },
        },
      });


    if (!activity) {

      throw new Error(
        "Activity not found"
      );
    }


    const googleData =
      await getAuthorizedCalendar(
        userId
      );


    if (!googleData) {

      await prisma.activity.update({
        where: {
          id:
            activity.id,
        },

        data: {
          googleSyncStatus:
            "NOT_CONNECTED",

          googleSyncError:
            null,
        },
      });


      return {
        connected:
          false,

        synced:
          false,

        code:
          "GOOGLE_CALENDAR_NOT_CONNECTED",
      };
    }


    const {
      calendar,
      connection,
    } =
      googleData;


    const event =
      buildGoogleEvent(
        activity,

        connection.timeZone,

        connection.emailReminderMinutes,

        connection.popupReminderMinutes
      );


    try {

      let googleEvent:
        calendar_v3.Schema$Event;


      // Existing event -> update
      if (
        activity.googleEventId
      ) {

        try {

          const result =
            await calendar.events.update({
              calendarId:
                activity.googleCalendarId ||
                connection.calendarId,

              eventId:
                activity.googleEventId,

              requestBody:
                event,

              sendUpdates:
                "none",
            });


          googleEvent =
            result.data;

        } catch (error: any) {

          const status =
            error?.response?.status;


          if (
            status !== 404 &&
            status !== 410
          ) {
            throw error;
          }


          const created =
            await calendar.events.insert({
              calendarId:
                connection.calendarId,

              requestBody:
                event,

              sendUpdates:
                "none",
            });


          googleEvent =
            created.data;
        }

      } else {

        // No event yet -> create
        const created =
          await calendar.events.insert({
            calendarId:
              connection.calendarId,

            requestBody:
              event,

            sendUpdates:
              "none",
          });


        googleEvent =
          created.data;
      }


      await prisma.activity.update({
        where: {
          id:
            activity.id,
        },

        data: {
          googleEventId:
            googleEvent.id ||
            null,

          googleCalendarId:
            connection.calendarId,

          googleSyncStatus:
            "SYNCED",

          googleSyncError:
            null,

          googleSyncedAt:
            new Date(),
        },
      });


      return {
        connected:
          true,

        synced:
          true,

        eventId:
          googleEvent.id,

        htmlLink:
          googleEvent.htmlLink,

        googleEmail:
          connection.googleEmail,
      };

    } catch (error: any) {

      const message =
        error?.response
          ?.data?.error?.message ||
        error?.message ||
        "Google Calendar synchronization failed";


      await prisma.activity.update({
        where: {
          id:
            activity.id,
        },

        data: {
          googleSyncStatus:
            "FAILED",

          googleSyncError:
            message,
        },
      });


      console.error(
        "Google Calendar sync error:",
        message
      );


      throw error;
    }
  };


// ======================================================
// DELETE GOOGLE EVENT
// ======================================================

export const deleteGoogleEventForActivity =
  async (
    userId: string,
    activityId: string
  ) => {

    const activity =
      await prisma.activity.findFirst({
        where: {
          id:
            activityId,

          dailyPlan: {
            userId,
          },
        },
      });


    if (!activity) {

      throw new Error(
        "Activity not found"
      );
    }


    if (
      !activity.googleEventId
    ) {

      return {
        deleted:
          false,

        code:
          "NO_GOOGLE_EVENT",
      };
    }


    const googleData =
      await getAuthorizedCalendar(
        userId
      );


    if (!googleData) {

      return {
        deleted:
          false,

        code:
          "GOOGLE_CALENDAR_NOT_CONNECTED",
      };
    }


    try {

      await googleData
        .calendar
        .events
        .delete({
          calendarId:
            activity.googleCalendarId ||
            googleData.connection
              .calendarId,

          eventId:
            activity.googleEventId,

          sendUpdates:
            "none",
        });


      return {
        deleted:
          true,
      };

    } catch (error: any) {

      if (
        error?.response?.status ===
          404 ||
        error?.response?.status ===
          410
      ) {

        return {
          deleted:
            true,
        };
      }


      throw error;
    }
  };