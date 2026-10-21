import {
  Response,
} from "express";

import {
  PrismaClient,
} from "@prisma/client";

import {
  AuthRequest,
} from "../middleware/auth.middleware";

import {
  closeLiveKitRoom,
  createLiveKitParticipantToken,
  ensureLiveKitRoom,
  getLiveKitRoomParticipantCount,
  getLiveKitUrl,
} from "../services/livekit.service";


const prisma =
  new PrismaClient();


// ======================================================
// JOIN WINDOW
// ======================================================

const JOIN_EARLY_MINUTES =
  10;

const JOIN_LATE_MINUTES =
  15;


// ======================================================
// HELPER
// AUTHORIZED APPOINTMENT PARTICIPANT
// ======================================================

const getAuthorizedAppointment =
  async (
    appointmentId: string,
    userId: string
  ) => {

    const appointment =
      await prisma.appointment.findUnique({
        where: {
          id:
            appointmentId,
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },

          practitioner: {
            select: {
              id: true,
              userId: true,

              user: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                },
              },
            },
          },

          enquiry: {
            select: {
              id: true,
              supportTopic: true,
            },
          },
        },
      });


    if (!appointment) {
      return null;
    }


    const isNormalUser =
      appointment.userId ===
      userId;


    const isPractitioner =
      appointment.practitioner.userId ===
      userId;


    if (
      !isNormalUser &&
      !isPractitioner
    ) {
      return null;
    }


    return {
      appointment,
      participantRole:
        isPractitioner
          ? "PRACTITIONER"
          : "USER",
    } as const;
  };


// ======================================================
// POST /api/video/appointments/:appointmentId/token
//
// AUTHORIZES USER OR PRACTITIONER
// AND RETURNS SHORT-LIVED LIVEKIT TOKEN
// ======================================================

export const createVideoCallToken = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res.status(401).json({
        message:
          "Unauthorized",
      });
    }


    const appointmentId =
      String(
        req.params.appointmentId
      );


    const authorized =
      await getAuthorizedAppointment(
        appointmentId,
        userId
      );


    if (!authorized) {
      return res.status(404).json({
        message:
          "Appointment not found",
      });
    }


    const {
      appointment,
      participantRole,
    } = authorized;


    if (
      appointment.status !==
      "CONFIRMED"
    ) {
      return res.status(409).json({
        message:
          "Only confirmed appointments can be joined",
      });
    }


    const now =
      Date.now();


    const joinOpensAt =
      appointment.scheduledStart.getTime() -
      JOIN_EARLY_MINUTES *
        60 *
        1000;


    const joinClosesAt =
      appointment.scheduledEnd.getTime() +
      JOIN_LATE_MINUTES *
        60 *
        1000;


    if (
      now <
      joinOpensAt
    ) {
      return res.status(403).json({
        message:
          `You can join this session ${JOIN_EARLY_MINUTES} minutes before it starts`,

        joinOpensAt:
          new Date(
            joinOpensAt
          ).toISOString(),
      });
    }


    if (
      now >
      joinClosesAt
    ) {
      return res.status(403).json({
        message:
          "The join window for this session has closed",
      });
    }


    let roomName =
      appointment.livekitRoomName;


    if (!roomName) {
      roomName =
        `anandam-session-${appointment.id}`;


      await prisma.appointment.update({
        where: {
          id:
            appointment.id,
        },

        data: {
          livekitRoomName:
            roomName,
        },
      });
    }


    await ensureLiveKitRoom(
      roomName
    );


    const participantName =
      participantRole ===
      "PRACTITIONER"
        ? (
            appointment
              .practitioner
              .user
              .fullName ||
            "Practitioner"
          )
        : (
            appointment
              .user
              .fullName ||
            "User"
          );


    const token =
      await createLiveKitParticipantToken({
        roomName,

        userId,

        participantName,

        role:
          participantRole,
      });


    /*
      We treat the first successful token
      request inside the join window as the
      beginning of the call session.

      Later we can make this more exact
      with LiveKit webhooks.
    */

    if (
      !appointment.callStartedAt
    ) {
      await prisma.appointment.update({
        where: {
          id:
            appointment.id,
        },

        data: {
          callStartedAt:
            new Date(),
        },
      });
    }


    return res.status(200).json({
      message:
        "Video call access granted",

      livekitUrl:
        getLiveKitUrl(),

      roomName,

      token,

      participant: {
        userId,

        name:
          participantName,

        role:
          participantRole,
      },

      appointment: {
        id:
          appointment.id,

        scheduledStart:
          appointment.scheduledStart,

        scheduledEnd:
          appointment.scheduledEnd,

        timeZone:
          appointment.timeZone,

        sessionType:
          appointment.sessionType,
      },
    });

  } catch (error) {
    console.error(
      "createVideoCallToken:",
      error
    );


    return res.status(500).json({
      message:
        "Unable to join video session",
    });
  }
};


// ======================================================
// GET /api/video/appointments/:appointmentId/status
// ======================================================

export const getVideoCallStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res.status(401).json({
        message:
          "Unauthorized",
      });
    }


    const appointmentId =
      String(
        req.params.appointmentId
      );


    const authorized =
      await getAuthorizedAppointment(
        appointmentId,
        userId
      );


    if (!authorized) {
      return res.status(404).json({
        message:
          "Appointment not found",
      });
    }


    const {
      appointment,
    } = authorized;


    const now =
      Date.now();


    const joinOpensAt =
      appointment.scheduledStart.getTime() -
      JOIN_EARLY_MINUTES *
        60 *
        1000;


    const joinClosesAt =
      appointment.scheduledEnd.getTime() +
      JOIN_LATE_MINUTES *
        60 *
        1000;


    let callStatus:
      | "SCHEDULED"
      | "READY"
      | "IN_PROGRESS"
      | "ENDED";


    if (
      appointment.callEndedAt ||
      appointment.status ===
        "COMPLETED"
    ) {
      callStatus =
        "ENDED";

    } else if (
      appointment.callStartedAt
    ) {
      callStatus =
        "IN_PROGRESS";

    } else if (
      now >= joinOpensAt &&
      now <= joinClosesAt
    ) {
      callStatus =
        "READY";

    } else {
      callStatus =
        "SCHEDULED";
    }


    let participantCount =
      0;


    if (
      appointment.livekitRoomName
    ) {
      try {
        participantCount =
          await getLiveKitRoomParticipantCount(
            appointment.livekitRoomName
          );

      } catch (error) {
        console.error(
          "Unable to read LiveKit participant count:",
          error
        );
      }
    }


    return res.status(200).json({
      appointmentId:
        appointment.id,

      callStatus,

      participantCount,

      joinAllowed:
        appointment.status ===
          "CONFIRMED" &&
        now >=
          joinOpensAt &&
        now <=
          joinClosesAt &&
        !appointment.callEndedAt,

      joinOpensAt:
        new Date(
          joinOpensAt
        ).toISOString(),

      joinClosesAt:
        new Date(
          joinClosesAt
        ).toISOString(),

      callStartedAt:
        appointment.callStartedAt,

      callEndedAt:
        appointment.callEndedAt,

      scheduledStart:
        appointment.scheduledStart,

      scheduledEnd:
        appointment.scheduledEnd,
    });

  } catch (error) {
    console.error(
      "getVideoCallStatus:",
      error
    );


    return res.status(500).json({
      message:
        "Unable to load video call status",
    });
  }
};


// ======================================================
// POST /api/video/appointments/:appointmentId/end
//
// ENDS ROOM + MARKS APPOINTMENT COMPLETED
//
// Either participant can end the session.
// Later we can distinguish LEAVE vs END FOR EVERYONE.
// ======================================================

export const endVideoCall = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;


    if (!userId) {
      return res.status(401).json({
        message:
          "Unauthorized",
      });
    }


    const appointmentId =
      String(
        req.params.appointmentId
      );


    const authorized =
      await getAuthorizedAppointment(
        appointmentId,
        userId
      );


    if (!authorized) {
      return res.status(404).json({
        message:
          "Appointment not found",
      });
    }


    const {
      appointment,
    } = authorized;


    if (
      appointment.callEndedAt
    ) {
      return res.status(200).json({
        message:
          "Session already ended",
      });
    }


    if (
      appointment.livekitRoomName
    ) {
      try {
        await closeLiveKitRoom(
          appointment.livekitRoomName
        );

      } catch (error) {
        console.error(
          "Unable to close LiveKit room:",
          error
        );
      }
    }


    const endedAt =
      new Date();


    const updatedAppointment =
      await prisma.appointment.update({
        where: {
          id:
            appointment.id,
        },

        data: {
          callEndedAt:
            endedAt,

          completedAt:
            endedAt,

          status:
            "COMPLETED",
        },
      });


    return res.status(200).json({
      message:
        "Video session ended",

      appointment:
        updatedAppointment,
    });

  } catch (error) {
    console.error(
      "endVideoCall:",
      error
    );


    return res.status(500).json({
      message:
        "Unable to end video session",
    });
  }
};