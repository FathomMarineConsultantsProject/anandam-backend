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
// POST /api/video/appointments/:appointmentId/connected
//
// Called by FE ONLY after LiveKit reports
// that the participant is actually connected.
//
// USER:
// - sets userJoinedAt
//
// PRACTITIONER:
// - sets practitionerJoinedAt
//
// First real connection:
// - sets callStartedAt
// ======================================================

export const markVideoCallConnected =
  async (
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
            "Only confirmed appointments can start a video session",
        });
      }


      if (
        appointment.callEndedAt
      ) {
        return res.status(409).json({
          message:
            "This video session has already ended",
        });
      }


      if (
        !appointment.livekitRoomName
      ) {
        return res.status(409).json({
          message:
            "Video room has not been created yet",
        });
      }


      const now =
        new Date();


      const updateData:
        {
          callStartedAt?:
          Date;

          userJoinedAt?:
          Date;

          practitionerJoinedAt?:
          Date;
        } = {};


      if (
        !appointment.callStartedAt
      ) {
        updateData.callStartedAt =
          now;
      }


      if (
        participantRole ===
        "USER" &&
        !appointment.userJoinedAt
      ) {
        updateData.userJoinedAt =
          now;
      }


      if (
        participantRole ===
        "PRACTITIONER" &&
        !appointment.practitionerJoinedAt
      ) {
        updateData.practitionerJoinedAt =
          now;
      }


      const updatedAppointment =
        Object.keys(
          updateData
        ).length > 0
          ? await prisma.appointment.update({
            where: {
              id:
                appointment.id,
            },

            data:
              updateData,
          })
          : appointment;


      return res.status(200).json({
        message:
          "Video participant connected",

        participant: {
          userId,

          role:
            participantRole,
        },

        appointment: {
          id:
            updatedAppointment.id,

          callStartedAt:
            updatedAppointment.callStartedAt,

          userJoinedAt:
            updatedAppointment.userJoinedAt,

          practitionerJoinedAt:
            updatedAppointment.practitionerJoinedAt,

          callEndedAt:
            updatedAppointment.callEndedAt,
        },
      });

    } catch (error) {
      console.error(
        "markVideoCallConnected:",
        error
      );


      return res.status(500).json({
        message:
          "Unable to mark video participant as connected",
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

      userJoinedAt:
        appointment.userJoinedAt,

      practitionerJoinedAt:
        appointment.practitionerJoinedAt,

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
// IMPORTANT:
//
// - Time passing NEVER completes a session.
// - Generating a token NEVER completes a session.
// - The appointment must have an active LiveKit room.
// - At least one actual participant must be connected.
// - Only then can the video session be ended.
//
// Later LiveKit webhooks will give us exact
// USER_JOINED / PRACTITIONER_JOINED tracking.
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
      appointment.status ===
      "COMPLETED"
    ) {
      return res.status(200).json({
        message:
          "Session already completed",
      });
    }


    if (
      appointment.status !==
      "CONFIRMED"
    ) {
      return res.status(409).json({
        message:
          "Only a confirmed appointment can be completed",
      });
    }


    if (
      appointment.callEndedAt
    ) {
      return res.status(200).json({
        message:
          "Session already ended",
      });
    }


    /*
      IMPORTANT:

      A room must actually have been created.

      If no LiveKit room exists then nobody
      ever entered the video session.
    */

    if (
      !appointment.livekitRoomName
    ) {
      return res.status(409).json({
        message:
          "This video session was never started",
      });
    }


    /*
      Check LiveKit itself.

      Do NOT treat scheduled time as proof
      that a video session happened.
    */

    let participantCount =
      0;


    try {
      participantCount =
        await getLiveKitRoomParticipantCount(
          appointment.livekitRoomName
        );
    } catch (error) {
      console.error(
        "Unable to verify LiveKit participants:",
        error
      );

      return res.status(409).json({
        message:
          "Unable to verify that the video session is active",
      });
    }


    /*
      The End Session action comes from
      inside the connected call.

      Therefore at least one participant
      must still be connected at the time
      this endpoint is called.
    */

    if (
      participantCount < 1
    ) {
      return res.status(409).json({
        message:
          "The video session has not been joined",
      });
    }


    const endedAt =
      new Date();


    /*
      callStartedAt represents an ACTUAL
      connected call, not token creation.

      Until LiveKit webhooks are added,
      if this is the first verified active
      call event we store it here.
    */

    const startedAt =
      appointment.callStartedAt ||
      endedAt;


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


    const updatedAppointment =
      await prisma.appointment.update({
        where: {
          id:
            appointment.id,
        },

        data: {
          callStartedAt:
            startedAt,

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
        "Video session completed",

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