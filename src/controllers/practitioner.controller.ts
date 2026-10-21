import { Response } from "express";

import {
  MarketplaceEnquiryStatus,
  AppointmentStatus,
  PrismaClient,
} from "@prisma/client";

import {
  AuthRequest,
} from "../middleware/auth.middleware";


const prisma =
  new PrismaClient();


const cleanString = (
  value: unknown
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
};


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
// PRACTITIONER OWN PROFILE
// ======================================================

export const getMyPractitionerProfile = async (
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
      await prisma.practitionerProfile.findUnique({
        where: {
          userId,
        },

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },

          specialties: {
            include: {
              specialty:
                true,
            },
          },
        },
      });


    if (!practitioner) {
      return res.status(404).json({
        message:
          "Practitioner profile not found",
      });
    }


    return res.status(200).json({
      practitioner,
    });

  } catch (error) {
    console.error(
      "getMyPractitionerProfile:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load practitioner profile",
    });
  }
};


// ======================================================
// PRACTITIONER ENQUIRIES
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


    const allowedStatuses =
      Object.values(
        MarketplaceEnquiryStatus
      );


    if (
      status &&
      !allowedStatuses.includes(
        status as MarketplaceEnquiryStatus
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
                  status as MarketplaceEnquiryStatus,
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
              email: true,
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
// PRACTITIONER GET ONE ENQUIRY
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
      String(
        req.params.enquiryId
      );


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
              email: true,
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
// PRACTITIONER ACCEPTS USER'S ORIGINAL REQUEST
//
// PENDING -> CONFIRMED
// Appointment created directly.
// ======================================================

export const acceptEnquiry = async (
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
      String(
        req.params.enquiryId
      );


    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          practitionerId:
            practitioner.id,

          status:
            "PENDING",
        },

        include: {
          appointment:
            true,
        },
      });


    if (!enquiry) {
      return res.status(404).json({
        message:
          "Pending enquiry not found",
      });
    }


    if (enquiry.appointment) {
      return res.status(409).json({
        message:
          "An appointment already exists for this enquiry",
      });
    }


    if (
      !enquiry.requestedStart ||
      !enquiry.requestedEnd ||
      !enquiry.timeZone
    ) {
      return res.status(409).json({
        message:
          "This enquiry does not contain a valid requested session time",
      });
    }


    const appointment =
      await prisma.$transaction(
        async (tx) => {

          await tx.marketplaceEnquiry.update({
            where: {
              id:
                enquiryId,
            },

            data: {
              status:
                "CONFIRMED",

              closedAt:
                null,
            },
          });


          const createdAppointment =
            await tx.appointment.create({
              data: {
                enquiryId,

                userId:
                  enquiry.userId,

                practitionerId:
                  practitioner.id,

                scheduledStart:
                  enquiry.requestedStart!,

                scheduledEnd:
                  enquiry.requestedEnd!,

                timeZone:
                  enquiry.timeZone!,

                sessionType:
                  "VIDEO",

                status:
                  "CONFIRMED",
              },
            });


          await tx.notification.create({
            data: {
              userId:
                enquiry.userId,

              type:
                "ENQUIRY_ACCEPTED",

              title:
                "Enquiry accepted",

              message:
                "The practitioner accepted your requested session time.",

              entityType:
                "APPOINTMENT",

              entityId:
                createdAppointment.id,
            },
          });


          await tx.notification.create({
            data: {
              userId,

              type:
                "SESSION_CONFIRMED",

              title:
                "Session confirmed",

              message:
                "The session has been scheduled.",

              entityType:
                "APPOINTMENT",

              entityId:
                createdAppointment.id,
            },
          });


          return createdAppointment;
        }
      );


    return res.status(201).json({
      message:
        "Enquiry accepted and session confirmed",

      appointment,
    });

  } catch (error) {
    console.error(
      "acceptEnquiry:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to accept enquiry",
    });
  }
};


// ======================================================
// PRACTITIONER PROPOSES / COUNTERS SESSION TIME
//
// PENDING
// RESCHEDULE_REQUESTED
// CONFIRMED (rescheduling booked appointment)
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
      String(
        req.params.enquiryId
      );


    const {
      proposedStart,
      proposedEnd,
      durationMinutes,
      timeZone,
      sessionType = "VIDEO",
      message,
    } = req.body;


    if (
      !proposedStart ||
      !timeZone ||
      (
        !proposedEnd &&
        !durationMinutes
      )
    ) {
      return res.status(400).json({
        message:
          "Proposed start, timezone and proposed end or duration are required",
      });
    }


    const start =
      new Date(
        proposedStart
      );


    if (
      Number.isNaN(
        start.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid proposed start time",
      });
    }


    let duration = 0;


    if (proposedEnd) {
      const end =
        new Date(
          proposedEnd
        );

      if (
        Number.isNaN(
          end.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid proposed end time",
        });
      }

      duration =
        Math.round(
          (
            end.getTime() -
            start.getTime()
          ) /
            60000
        );
    } else {
      duration =
        Number(
          durationMinutes
        );
    }


    if (
      !Number.isFinite(
        duration
      ) ||
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

          proposals: {
            where: {
              status:
                "PENDING",
            },
          },
        },
      });


    if (!enquiry) {
      return res.status(404).json({
        message:
          "Enquiry not found",
      });
    }


    if (
      enquiry.status ===
        "DECLINED" ||
      enquiry.status ===
        "CLOSED"
    ) {
      return res.status(409).json({
        message:
          "This enquiry is closed",
      });
    }


    const allowedStatuses: MarketplaceEnquiryStatus[] = [
      MarketplaceEnquiryStatus.PENDING,
      MarketplaceEnquiryStatus.RESCHEDULE_REQUESTED,
      MarketplaceEnquiryStatus.CONFIRMED,
    ];


    if (
      !allowedStatuses.includes(
        enquiry.status
      )
    ) {
      return res.status(409).json({
        message:
          "A new session time cannot be proposed in the enquiry's current state",
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

              respondedAt:
                new Date(),
            },
          });


          const createdProposal =
            await tx.sessionProposal.create({
              data: {
                enquiryId,

                proposedStart:
                  start,

                durationMinutes:
                  duration,

                timeZone:
                  String(
                    timeZone
                  ),

                sessionType:
                  String(
                    sessionType
                  ),

                proposedBy:
                  "PRACTITIONER",

                practitionerMessage:
                  cleanString(
                    message
                  ),

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

              closedAt:
                null,
            },
          });


          await tx.notification.create({
            data: {
              userId:
                enquiry.userId,

              type:
                enquiry.appointment
                  ? "RESCHEDULE_REQUESTED"
                  : "NEW_TIME_PROPOSED",

              title:
                enquiry.appointment
                  ? "New session time proposed"
                  : "Call time proposed",

              message:
                enquiry.appointment
                  ? "The practitioner suggested a new time for your scheduled session."
                  : "The practitioner suggested a session time for you to review.",

              entityType:
                "MARKETPLACE_ENQUIRY",

              entityId:
                enquiryId,
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
// PRACTITIONER ACCEPTS USER COUNTER-PROPOSAL
// ======================================================

export const acceptUserProposal = async (
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
      String(
        req.params.enquiryId
      );

    const proposalId =
      String(
        req.params.proposalId
      );


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
      enquiry.status !==
      "RESCHEDULE_REQUESTED"
    ) {
      return res.status(409).json({
        message:
          "There is no user reschedule proposal awaiting confirmation",
      });
    }


    const proposal =
      await prisma.sessionProposal.findFirst({
        where: {
          id:
            proposalId,

          enquiryId,

          status:
            "PENDING",

          proposedBy:
            "USER",
        },
      });


    if (!proposal) {
      return res.status(404).json({
        message:
          "Active user proposal not found",
      });
    }


    const scheduledEnd =
      new Date(
        proposal.proposedStart.getTime() +
          proposal.durationMinutes *
            60 *
            1000
      );


    const appointment =
      await prisma.$transaction(
        async (tx) => {

          await tx.sessionProposal.updateMany({
            where: {
              enquiryId,

              status:
                "PENDING",

              NOT: {
                id:
                  proposalId,
              },
            },

            data: {
              status:
                "SUPERSEDED",

              respondedAt:
                new Date(),
            },
          });


          await tx.sessionProposal.update({
            where: {
              id:
                proposalId,
            },

            data: {
              status:
                "ACCEPTED",

              respondedAt:
                new Date(),
            },
          });


          await tx.marketplaceEnquiry.update({
            where: {
              id:
                enquiryId,
            },

            data: {
              status:
                "CONFIRMED",

              closedAt:
                null,
            },
          });


          const savedAppointment =
            await tx.appointment.upsert({
              where: {
                enquiryId,
              },

              update: {
                scheduledStart:
                  proposal.proposedStart,

                scheduledEnd,

                timeZone:
                  proposal.timeZone,

                sessionType:
                  proposal.sessionType,

                status:
                  "CONFIRMED",

                cancelledAt:
                  null,
              },

              create: {
                enquiryId,

                userId:
                  enquiry.userId,

                practitionerId:
                  practitioner.id,

                scheduledStart:
                  proposal.proposedStart,

                scheduledEnd,

                timeZone:
                  proposal.timeZone,

                sessionType:
                  proposal.sessionType,

                status:
                  "CONFIRMED",
              },
            });


          await tx.notification.create({
            data: {
              userId:
                enquiry.userId,

              type:
                "SESSION_CONFIRMED",

              title:
                "Session confirmed",

              message:
                "The practitioner accepted your proposed session time.",

              entityType:
                "APPOINTMENT",

              entityId:
                savedAppointment.id,
            },
          });


          await tx.notification.create({
            data: {
              userId,

              type:
                "SESSION_CONFIRMED",

              title:
                "Session confirmed",

              message:
                "You accepted the user's proposed session time.",

              entityType:
                "APPOINTMENT",

              entityId:
                savedAppointment.id,
            },
          });


          return savedAppointment;
        }
      );


    return res.status(200).json({
      message:
        "Session confirmed",

      appointment,
    });

  } catch (error) {
    console.error(
      "acceptUserProposal:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to accept proposed session time",
    });
  }
};


// ======================================================
// PRACTITIONER DECLINES USER COUNTER-PROPOSAL
// ======================================================

export const declineUserProposal = async (
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
      String(
        req.params.enquiryId
      );

    const proposalId =
      String(
        req.params.proposalId
      );


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


    const proposal =
      await prisma.sessionProposal.findFirst({
        where: {
          id:
            proposalId,

          enquiryId,

          status:
            "PENDING",

          proposedBy:
            "USER",
        },
      });


    if (!proposal) {
      return res.status(404).json({
        message:
          "Active user proposal not found",
      });
    }


    const keepExistingAppointment =
      Boolean(
        enquiry.appointment
      );


    const result =
      await prisma.$transaction(
        async (tx) => {

          const updatedProposal =
            await tx.sessionProposal.update({
              where: {
                id:
                  proposalId,
              },

              data: {
                status:
                  "DECLINED",

                practitionerMessage:
                  cleanString(
                    reason
                  ),

                respondedAt:
                  new Date(),
              },
            });


          const updatedEnquiry =
            await tx.marketplaceEnquiry.update({
              where: {
                id:
                  enquiryId,
              },

              data:
                keepExistingAppointment
                  ? {
                      status:
                        "CONFIRMED",

                      closedAt:
                        null,
                    }
                  : {
                      status:
                        "DECLINED",

                      declinedReason:
                        cleanString(
                          reason
                        ),

                      closedAt:
                        new Date(),
                    },
            });


          await tx.notification.create({
            data: {
              userId:
                enquiry.userId,

              type:
                "PROPOSAL_DECLINED",

              title:
                keepExistingAppointment
                  ? "Reschedule request declined"
                  : "Session request declined",

              message:
                keepExistingAppointment
                  ? "The practitioner declined the reschedule request. Your existing session remains scheduled."
                  : "The practitioner declined the proposed session time.",

              entityType:
                "MARKETPLACE_ENQUIRY",

              entityId:
                enquiryId,
            },
          });


          return {
            proposal:
              updatedProposal,

            enquiry:
              updatedEnquiry,
          };
        }
      );


    return res.status(200).json({
      message:
        keepExistingAppointment
          ? "Reschedule request declined"
          : "Session request declined",

      ...result,
    });

  } catch (error) {
    console.error(
      "declineUserProposal:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to decline proposed session time",
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
      String(
        req.params.enquiryId
      );


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


    if (enquiry.appointment) {
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

              respondedAt:
                new Date(),
            },
          });


          const updated =
            await tx.marketplaceEnquiry.update({
              where: {
                id:
                  enquiryId,
              },

              data: {
                status:
                  "DECLINED",

                declinedReason:
                  cleanString(
                    reason
                  ),

                closedAt:
                  new Date(),
              },
            });


          await tx.notification.create({
            data: {
              userId:
                enquiry.userId,

              type:
                "ENQUIRY_DECLINED",

              title:
                "Enquiry declined",

              message:
                "The practitioner was unable to accept your session request.",

              entityType:
                "MARKETPLACE_ENQUIRY",

              entityId:
                enquiryId,
            },
          });


          return updated;
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
// PRACTITIONER APPOINTMENTS
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


    const allowedStatuses =
      Object.values(
        AppointmentStatus
      );


    if (
      status &&
      !allowedStatuses.includes(
        status as AppointmentStatus
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
                  status as AppointmentStatus,
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
              email: true,
            },
          },

          enquiry: {
            select: {
              id: true,
              supportTopic: true,
              status: true,
              message: true,
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
// PRACTITIONER GET SINGLE APPOINTMENT
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
      String(
        req.params.appointmentId
      );


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
              email: true,
            },
          },

          enquiry: {
            select: {
              id: true,
              supportTopic: true,
              message: true,
              status: true,
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