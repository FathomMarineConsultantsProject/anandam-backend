import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();


// ======================================================
// CREATE ENQUIRY
// USER -> PRACTITIONER
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
      preferredDays = [],
      preferredTimes = [],
      timeZone,
    } = req.body;

    if (!practitionerId) {
      return res.status(400).json({
        message:
          "Practitioner is required",
      });
    }

    const practitioner =
      await prisma.practitionerProfile.findFirst({
        where: {
          id: practitionerId,
          approvalStatus:
            "APPROVED",
          isVisible: true,
          acceptingNewClients:
            true,
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

    const enquiry =
      await prisma.marketplaceEnquiry.create({
        data: {
          userId,
          practitionerId,

          supportTopic:
            typeof supportTopic ===
            "string"
              ? supportTopic.trim() ||
                null
              : null,

          message:
            typeof message ===
            "string"
              ? message.trim() ||
                null
              : null,

          preferredDays:
            Array.isArray(
              preferredDays
            )
              ? preferredDays
              : [],

          preferredTimes:
            Array.isArray(
              preferredTimes
            )
              ? preferredTimes
              : [],

          timeZone:
            typeof timeZone ===
            "string"
              ? timeZone
              : null,

          status: "PENDING",
        },
      });

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
// USER SIDE
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
        message:
          "Unauthorized",
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
        message:
          "Unauthorized",
      });
    }

    const enquiryId =
  String(req.params.enquiryId);

    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id: enquiryId,
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
// USER REQUESTS ANOTHER TIME
//
// TIME_PROPOSED
// -> RESCHEDULE_REQUESTED
// ======================================================

export const requestAnotherTime = async (
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

    const enquiryId =
  String(req.params.enquiryId);

const proposalId =
  String(req.params.proposalId);

    const {
      message,
    } = req.body;

    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id: enquiryId,
          userId,
        },

        include: {
          proposals: true,
          appointment: true,
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

    if (
      enquiry.status !==
      "TIME_PROPOSED"
    ) {
      return res.status(409).json({
        message:
          "Another time can only be requested when a session time has been proposed",
      });
    }

    const proposal =
      enquiry.proposals.find(
        (item) =>
          item.id ===
            proposalId &&
          item.status ===
            "PENDING"
      );

    if (!proposal) {
      return res.status(404).json({
        message:
          "Active proposal not found",
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

          const updatedProposal =
            await tx.sessionProposal.update({
              where: {
                id: proposalId,
              },

              data: {
                status:
                  "DECLINED",

                userResponseMessage:
                  typeof message ===
                  "string"
                    ? message.trim() ||
                      null
                    : null,

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

              data: {
                status:
                  "RESCHEDULE_REQUESTED",
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
        "Another time has been requested",
      ...result,
    });

  } catch (error) {
    console.error(
      "requestAnotherTime:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to request another time",
    });
  }
};

// ======================================================
// ACCEPT PRACTITIONER PROPOSAL
//
// TIME_PROPOSED
// -> CONFIRMED
// -> APPOINTMENT CREATED
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
        message:
          "Unauthorized",
      });
    }

    const enquiryId =
      String(req.params.enquiryId);

    const proposalId =
      String(req.params.proposalId);

    const enquiry =
      await prisma.marketplaceEnquiry.findFirst({
        where: {
          id:
            enquiryId,

          userId,
        },

        include: {
          proposals:
            true,

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

    if (
      enquiry.status !==
      "TIME_PROPOSED"
    ) {
      return res.status(409).json({
        message:
          "There is currently no proposed session to confirm",
      });
    }

    const proposal =
      enquiry.proposals.find(
        (item) =>
          item.id ===
            proposalId &&
          item.status ===
            "PENDING"
      );

    if (!proposal) {
      return res.status(404).json({
        message:
          "Active proposal not found",
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
            },
          });

          return tx.appointment.create({
            data: {
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
            },
          });
        }
      );

    return res.status(201).json({
      message:
        "Appointment confirmed",

      appointment,
    });
  } catch (error) {
    console.error(
      "acceptProposal:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to confirm appointment",
    });
  }
};

// ======================================================
// USER DECLINES PROPOSED SESSION
//
// TIME_PROPOSED
// -> CLOSED
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
        message:
          "Unauthorized",
      });
    }

   const enquiryId =
  String(req.params.enquiryId);

const proposalId =
  String(req.params.proposalId);

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
          proposals: true,
          appointment: true,
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

    if (
      enquiry.status !==
      "TIME_PROPOSED"
    ) {
      return res.status(409).json({
        message:
          "There is no active proposed session to decline",
      });
    }

    const proposal =
      enquiry.proposals.find(
        (item) =>
          item.id ===
            proposalId &&
          item.status ===
            "PENDING"
      );

    if (!proposal) {
      return res.status(404).json({
        message:
          "Active proposal not found",
      });
    }

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
                  typeof message ===
                  "string"
                    ? message.trim() ||
                      null
                    : null,

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

              data: {
                status:
                  "CLOSED",

                closedAt:
                  new Date(),
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
        "Session proposal declined and enquiry closed",
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