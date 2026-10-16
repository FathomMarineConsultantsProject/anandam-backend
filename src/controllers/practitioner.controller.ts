import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();


// ======================================================
// HELPER
// ======================================================

const getPractitionerProfile = async (
  userId: string
) => {
  return prisma.practitionerProfile.findUnique({
    where: {
      userId,
    },
  });
};


// ======================================================
// PRACTITIONER - GET ENQUIRIES
// Optional ?status=PENDING
// ======================================================

export const getPractitionerEnquiries = async (
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

    const practitioner =
      await getPractitionerProfile(
        userId
      );

    if (!practitioner) {
      return res.status(403).json({
        message:
          "Practitioner access required",
      });
    }

    const status =
      typeof req.query.status ===
      "string"
        ? req.query.status
        : undefined;

    const allowedStatuses = [
      "PENDING",
      "TIME_PROPOSED",
      "RESCHEDULE_REQUESTED",
      "CONFIRMED",
      "DECLINED",
      "CLOSED",
    ];

    if (
      status &&
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid enquiry status",
      });
    }

    const enquiries =
      await prisma.marketplaceEnquiry.findMany({
        where: {
          practitionerId:
            practitioner.id,

          ...(status
            ? {
                status:
                  status as any,
              }
            : {}),
        },

        orderBy: {
          updatedAt:
            "desc",
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },

          proposals: {
            orderBy: {
              createdAt:
                "desc",
            },
          },

          appointment:
            true,
        },
      });

    return res.status(200).json({
      enquiries,
    });

  } catch (error) {
    console.error(
      "getPractitionerEnquiries:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load enquiries",
    });
  }
};


// ======================================================
// PRACTITIONER - GET ONE ENQUIRY
// ======================================================

export const getPractitionerEnquiryById = async (
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

    const practitioner =
      await getPractitionerProfile(
        userId
      );

    if (!practitioner) {
      return res.status(403).json({
        message:
          "Practitioner access required",
      });
    }

    const enquiryId =
  String(req.params.enquiryId);

    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          practitionerId:
            practitioner.id,
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },

          proposals: {
            orderBy: {
              createdAt:
                "desc",
            },
          },

          appointment:
            true,
        },
      });

    if (!enquiry) {
      return res.status(404).json({
        message:
          "Enquiry not found",
      });
    }

    return res.status(200).json({
      enquiry,
    });

  } catch (error) {
    console.error(
      "getPractitionerEnquiryById:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load enquiry",
    });
  }
};


// ======================================================
// PRACTITIONER PROPOSES SESSION TIME
//
// PENDING
// OR
// RESCHEDULE_REQUESTED
//
// -> TIME_PROPOSED
// ======================================================

export const proposeSessionTime = async (
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

    const practitioner =
      await getPractitionerProfile(
        userId
      );

    if (!practitioner) {
      return res.status(403).json({
        message:
          "Practitioner access required",
      });
    }

    const enquiryId =
  String(req.params.enquiryId);

    const {
      proposedStart,
      durationMinutes,
      timeZone,
      sessionType = "VIDEO",
      message,
    } = req.body;

    if (
      !proposedStart ||
      !durationMinutes ||
      !timeZone
    ) {
      return res.status(400).json({
        message:
          "Proposed start, duration and timezone are required",
      });
    }

    const parsedStart =
      new Date(
        proposedStart
      );

    if (
      Number.isNaN(
        parsedStart.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid proposed start time",
      });
    }

    const duration =
      Number(
        durationMinutes
      );

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return res.status(400).json({
        message:
          "Duration must be greater than zero",
      });
    }

    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          practitionerId:
            practitioner.id,
        },

        include: {
          appointment:
            true,
        },
      });

    if (!enquiry) {
      return res.status(404).json({
        message:
          "Enquiry not found",
      });
    }

    if (
      enquiry.appointment
    ) {
      return res.status(409).json({
        message:
          "This enquiry already has a confirmed appointment",
      });
    }

    const allowedStatuses = [
      "PENDING",
      "RESCHEDULE_REQUESTED",
    ];

    if (
      !allowedStatuses.includes(
        enquiry.status
      )
    ) {
      return res.status(409).json({
        message:
          "A session time cannot be proposed for this enquiry in its current state",
      });
    }

    const proposal =
      await prisma.$transaction(
        async (tx) => {

          await tx.sessionProposal.updateMany({
            where: {
              enquiryId,
              status:
                "PENDING",
            },

            data: {
              status:
                "SUPERSEDED",
            },
          });

          const createdProposal =
            await tx.sessionProposal.create({
              data: {
                enquiryId,

                proposedStart:
                  parsedStart,

                durationMinutes:
                  duration,

                timeZone,

                sessionType,

                practitionerMessage:
                  typeof message ===
                  "string"
                    ? message.trim() ||
                      null
                    : null,

                status:
                  "PENDING",
              },
            });

          await tx.marketplaceEnquiry.update({
            where: {
              id:
                enquiryId,
            },

            data: {
              status:
                "TIME_PROPOSED",
            },
          });

          return createdProposal;
        }
      );

    return res.status(201).json({
      message:
        "Session time proposed",
      proposal,
    });

  } catch (error) {
    console.error(
      "proposeSessionTime:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to propose session time",
    });
  }
};


// ======================================================
// PRACTITIONER DECLINES ENQUIRY
// ======================================================

export const declineEnquiry = async (
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

    const practitioner =
      await getPractitionerProfile(
        userId
      );

    if (!practitioner) {
      return res.status(403).json({
        message:
          "Practitioner access required",
      });
    }

   const enquiryId =
  String(req.params.enquiryId);

    const {
      reason,
    } = req.body;

    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          practitionerId:
            practitioner.id,
        },

        include: {
          appointment:
            true,
        },
      });

    if (!enquiry) {
      return res.status(404).json({
        message:
          "Enquiry not found",
      });
    }

    if (
      enquiry.appointment
    ) {
      return res.status(409).json({
        message:
          "A confirmed appointment cannot be declined as an enquiry",
      });
    }

    if (
      enquiry.status ===
        "DECLINED" ||
      enquiry.status ===
        "CLOSED" ||
      enquiry.status ===
        "CONFIRMED"
    ) {
      return res.status(409).json({
        message:
          "This enquiry can no longer be declined",
      });
    }

    const updatedEnquiry =
      await prisma.$transaction(
        async (tx) => {

          await tx.sessionProposal.updateMany({
            where: {
              enquiryId,
              status:
                "PENDING",
            },

            data: {
              status:
                "SUPERSEDED",
            },
          });

          return tx.marketplaceEnquiry.update({
            where: {
              id:
                enquiryId,
            },

            data: {
              status:
                "DECLINED",

              declinedReason:
                typeof reason ===
                "string"
                  ? reason.trim() ||
                    null
                  : null,

              closedAt:
                new Date(),
            },
          });
        }
      );

    return res.status(200).json({
      message:
        "Enquiry declined",
      enquiry:
        updatedEnquiry,
    });

  } catch (error) {
    console.error(
      "declineEnquiry:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to decline enquiry",
    });
  }
};


// ======================================================
// PRACTITIONER - GET APPOINTMENTS
//
// ?status=CONFIRMED
// ?status=COMPLETED
// ======================================================

export const getPractitionerAppointments = async (
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

    const practitioner =
      await getPractitionerProfile(
        userId
      );

    if (!practitioner) {
      return res.status(403).json({
        message:
          "Practitioner access required",
      });
    }

    const status =
      typeof req.query.status ===
      "string"
        ? req.query.status
        : undefined;

    const allowedStatuses = [
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];

    if (
      status &&
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid appointment status",
      });
    }

    const appointments =
      await prisma.appointment.findMany({
        where: {
          practitionerId:
            practitioner.id,

          ...(status
            ? {
                status:
                  status as any,
              }
            : {}),
        },

        orderBy: {
          scheduledStart:
            "asc",
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },

          enquiry: {
            select: {
              id: true,
              supportTopic: true,
              status: true,
            },
          },
        },
      });

    return res.status(200).json({
      appointments,
    });

  } catch (error) {
    console.error(
      "getPractitionerAppointments:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load appointments",
    });
  }
};


// ======================================================
// PRACTITIONER - GET SINGLE APPOINTMENT
// ======================================================

export const getPractitionerAppointmentById = async (
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

    const practitioner =
      await getPractitionerProfile(
        userId
      );

    if (!practitioner) {
      return res.status(403).json({
        message:
          "Practitioner access required",
      });
    }

    const appointmentId =
  String(req.params.appointmentId);

    const appointment =
      await prisma.appointment.findFirst({
        where: {
          id:
            appointmentId,

          practitionerId:
            practitioner.id,
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },

          enquiry: {
            select: {
              id: true,
              supportTopic: true,
              message: true,
            },
          },
        },
      });

    if (!appointment) {
      return res.status(404).json({
        message:
          "Appointment not found",
      });
    }

    return res.status(200).json({
      appointment,
    });

  } catch (error) {
    console.error(
      "getPractitionerAppointmentById:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load appointment",
    });
  }
};