import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();


// ======================================================
// HELPER
// ======================================================

const cleanString = (
  value: unknown
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  return cleaned || null;
};


// ======================================================
// CREATE ENQUIRY
// NORMAL USER -> PRACTITIONER
// ======================================================

export const createEnquiry = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }


    const {
      practitionerId,
      supportTopic,
      message,
      requestedStart,
      requestedEnd,
      timeZone,
      preferredLanguage,
    } = req.body;


    if (
      !practitionerId ||
      !requestedStart ||
      !requestedEnd ||
      !timeZone
    ) {
      return res.status(400).json({
        message:
          "Practitioner, requested start, requested end and timezone are required",
      });
    }


    const start =
      new Date(requestedStart);

    const end =
      new Date(requestedEnd);


    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid requested session date or time",
      });
    }


    if (end <= start) {
      return res.status(400).json({
        message:
          "Session end time must be after the start time",
      });
    }


    const practitioner =
      await prisma.practitionerProfile.findFirst({
        where: {
  id: String(
    practitionerId
  ),

  approvalStatus:
    "APPROVED",

  onboardingCompleted:
    true,

  isVisible:
    true,

  acceptingNewClients:
    true,

  user: {
    role:
      "PRACTITIONER",
  },
},

        select: {
          id: true,
          userId: true,

          user: {
            select: {
              fullName: true,
            },
          },
        },
      });


    if (!practitioner) {
      return res.status(404).json({
        message:
          "This practitioner is currently unavailable",
      });
    }


    if (
      practitioner.userId ===
      userId
    ) {
      return res.status(400).json({
        message:
          "You cannot send an enquiry to your own practitioner profile",
      });
    }


    const sender =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          fullName: true,
        },
      });


    const enquiry =
      await prisma.$transaction(
        async (tx) => {
          const createdEnquiry =
            await tx.marketplaceEnquiry.create({
              data: {
                userId,

                practitionerId:
                  practitioner.id,

                supportTopic:
                  cleanString(
                    supportTopic
                  ),

                message:
                  cleanString(
                    message
                  ),

                requestedStart:
                  start,

                requestedEnd:
                  end,

                timeZone:
                  String(
                    timeZone
                  ),

                preferredLanguage:
                  cleanString(
                    preferredLanguage
                  ),

                status:
                  "PENDING",
              },
            });


          await tx.notification.create({
            data: {
              userId:
                practitioner.userId,

              type:
                "NEW_ENQUIRY",

              title:
                "New enquiry",

              message:
                `${sender?.fullName ||
                "A user"
                } sent you a new session enquiry.`,

              entityType:
                "MARKETPLACE_ENQUIRY",

              entityId:
                createdEnquiry.id,
            },
          });


          return createdEnquiry;
        }
      );


    return res.status(201).json({
      message:
        "Enquiry sent",

      enquiry,
    });

  } catch (error) {
    console.error(
      "createEnquiry:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to send enquiry",
    });
  }
};


// ======================================================
// GET MY ENQUIRIES
// NORMAL USER ONLY
// ======================================================

export const getMyEnquiries = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }


    const enquiries =
      await prisma.marketplaceEnquiry.findMany({
        where: {
          userId,
        },

        orderBy: {
          updatedAt:
            "desc",
        },

        include: {
          practitioner: {
            select: {
              id: true,
              slug: true,

              practitionerType: true,
              professionalTitle: true,

              profileImageUrl: true,

              location: true,

              sessionDurationMinutes: true,
              sessionPrice: true,
              currency: true,

              user: {
                select: {
                  fullName: true,
                },
              },
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
      "getMyEnquiries:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load enquiries",
    });
  }
};


// ======================================================
// GET SINGLE USER ENQUIRY
// ======================================================

export const getMyEnquiryById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
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

          userId,
        },

        include: {
          practitioner: {
            select: {
              id: true,
              slug: true,
              practitionerType: true,
              professionalTitle: true,
              profileImageUrl: true,
              sessionDurationMinutes: true,
              sessionPrice: true,
              currency: true,

              user: {
                select: {
                  fullName: true,
                },
              },

              specialties: {
                include: {
                  specialty:
                    true,
                },
              },
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
      "getMyEnquiryById:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load enquiry",
    });
  }
};


// ======================================================
// USER PROPOSES / REQUESTS ANOTHER TIME
//
// Used when:
// 1. practitioner proposed a time and user counters
// 2. confirmed appointment exists and user asks to reschedule
//
// -> RESCHEDULE_REQUESTED
// ======================================================

export const proposeAnotherTime = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }


    const enquiryId =
      String(
        req.params.enquiryId
      );

    const routeProposalId =
      req.params.proposalId
        ? String(
          req.params.proposalId
        )
        : null;


    const {
      proposedStart,
      proposedEnd,
      durationMinutes,
      timeZone,
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
          "Session duration must be greater than zero",
      });
    }


    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          userId,
        },

        include: {
          practitioner: {
            select: {
              id: true,
              userId: true,
            },
          },

          proposals: {
            where: {
              status:
                "PENDING",
            },

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


    const activeProposal =
      enquiry.proposals.find(
        (proposal) =>
          proposal.proposedBy ===
          "PRACTITIONER"
      );


    if (
      enquiry.status ===
      "TIME_PROPOSED" &&
      !activeProposal
    ) {
      return res.status(409).json({
        message:
          "No active practitioner proposal was found",
      });
    }


    if (
      routeProposalId &&
      (
        !activeProposal ||
        activeProposal.id !==
        routeProposalId
      )
    ) {
      return res.status(404).json({
        message:
          "Active practitioner proposal not found",
      });
    }


    if (
      enquiry.status !==
      "TIME_PROPOSED" &&
      enquiry.status !==
      "CONFIRMED"
    ) {
      return res.status(409).json({
        message:
          "A new time cannot be proposed in the enquiry's current state",
      });
    }


    const result =
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


          const proposal =
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
                  enquiry.appointment
                    ?.sessionType ||
                  activeProposal
                    ?.sessionType ||
                  "VIDEO",

                proposedBy:
                  "USER",

                userResponseMessage:
                  cleanString(
                    message
                  ),

                status:
                  "PENDING",
              },
            });


          const updatedEnquiry =
            await tx.marketplaceEnquiry.update({
              where: {
                id:
                  enquiryId,
              },

              data: {
                status:
                  "RESCHEDULE_REQUESTED",

                closedAt:
                  null,
              },
            });


          await tx.notification.create({
            data: {
              userId:
                enquiry.practitioner.userId,

              type:
                "RESCHEDULE_REQUESTED",

              title:
                "Reschedule requested",

              message:
                "The user suggested another session time.",

              entityType:
                "MARKETPLACE_ENQUIRY",

              entityId:
                enquiryId,
            },
          });


          return {
            proposal,
            enquiry:
              updatedEnquiry,
          };
        }
      );


    return res.status(201).json({
      message:
        "New session time proposed",

      ...result,
    });

  } catch (error) {
    console.error(
      "proposeAnotherTime:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to propose another time",
    });
  }
};


// ======================================================
// USER ACCEPTS PRACTITIONER PROPOSAL
//
// Creates appointment if none exists.
// Updates appointment if this was a reschedule.
// ======================================================

export const acceptProposal = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
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

          userId,
        },

        include: {
          practitioner: {
            select: {
              userId: true,
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


    const proposal =
      await prisma.sessionProposal.findFirst({
        where: {
          id:
            proposalId,

          enquiryId,

          status:
            "PENDING",

          proposedBy:
            "PRACTITIONER",
        },
      });


    if (!proposal) {
      return res.status(404).json({
        message:
          "Active practitioner proposal not found",
      });
    }


    if (
      enquiry.status !==
      "TIME_PROPOSED"
    ) {
      return res.status(409).json({
        message:
          "There is currently no practitioner proposal awaiting confirmation",
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

                userId,

                practitionerId:
                  enquiry.practitionerId,

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
                enquiry.practitioner.userId,

              type:
                "SESSION_CONFIRMED",

              title:
                "Session confirmed",

              message:
                "The user accepted the proposed session time.",

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
                "Your session is confirmed.",

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
      "acceptProposal:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to confirm session",
    });
  }
};


// ======================================================
// USER DECLINES PRACTITIONER PROPOSAL
//
// Before booking -> enquiry CLOSED.
// Existing booked session -> proposal rejected,
// original appointment remains confirmed.
// ======================================================

export const declineProposal = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
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
      message,
    } = req.body;


    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          userId,
        },

        include: {
          practitioner: {
            select: {
              userId: true,
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


    const proposal =
      await prisma.sessionProposal.findFirst({
        where: {
          id:
            proposalId,

          enquiryId,

          status:
            "PENDING",

          proposedBy:
            "PRACTITIONER",
        },
      });


    if (!proposal) {
      return res.status(404).json({
        message:
          "Active practitioner proposal not found",
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

                userResponseMessage:
                  cleanString(
                    message
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
                      "CLOSED",

                    closedAt:
                      new Date(),
                  },
            });


          await tx.notification.create({
            data: {
              userId:
                enquiry.practitioner.userId,

              type:
                "PROPOSAL_DECLINED",

              title:
                "Session proposal declined",

              message:
                keepExistingAppointment
                  ? "The user declined the reschedule request. The existing session remains scheduled."
                  : "The user declined the proposed session time.",

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
          ? "Reschedule declined. Existing appointment remains confirmed."
          : "Session proposal declined",

      ...result,
    });

  } catch (error) {
    console.error(
      "declineProposal:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to decline session proposal",
    });
  }
};