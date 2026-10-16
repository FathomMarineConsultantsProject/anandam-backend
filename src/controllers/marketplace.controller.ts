import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


// ======================================================
// GET MARKETPLACE PRACTITIONERS
// ======================================================

export const getPractitioners = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      search,
      type,
      specialty,
      language,
      minPrice,
      maxPrice,
      page = "1",
      limit = "12",
    } = req.query;

    const pageNumber =
      Math.max(Number(page) || 1, 1);

    const pageSize =
      Math.min(
        Math.max(Number(limit) || 12, 1),
        50
      );

    const where: any = {
      approvalStatus: "APPROVED",
      isVisible: true,
      acceptingNewClients: true,
    };

    if (type) {
      where.practitionerType =
        String(type);
    }

    if (language) {
      where.languages = {
        has: String(language),
      };
    }

    if (minPrice || maxPrice) {
      where.sessionPrice = {};

      if (minPrice) {
        where.sessionPrice.gte =
          Number(minPrice);
      }

      if (maxPrice) {
        where.sessionPrice.lte =
          Number(maxPrice);
      }
    }

    if (specialty) {
      where.specialties = {
        some: {
          specialty: {
            slug:
              String(specialty),
          },
        },
      };
    }

    if (search) {
      const query =
        String(search).trim();

      if (query) {
        where.OR = [
          {
            user: {
              fullName: {
                contains: query,
                mode: "insensitive",
              },
            },
          },

          {
            professionalTitle: {
              contains: query,
              mode: "insensitive",
            },
          },

          {
            shortBio: {
              contains: query,
              mode: "insensitive",
            },
          },

          {
            specialties: {
              some: {
                specialty: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        ];
      }
    }

    const [
      practitioners,
      total,
    ] = await Promise.all([
      prisma.practitionerProfile.findMany({
        where,

        skip:
          (pageNumber - 1) *
          pageSize,

        take: pageSize,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          slug: true,
          practitionerType: true,
          professionalTitle: true,
          shortBio: true,
          profileImageUrl: true,
          experienceYears: true,
          languages: true,
          sessionDurationMinutes: true,
          sessionPrice: true,
          currency: true,
          acceptingNewClients: true,

          user: {
            select: {
              fullName: true,
            },
          },

          specialties: {
            select: {
              specialty: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.practitionerProfile.count({
        where,
      }),
    ]);

    return res.status(200).json({
      practitioners,

      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages:
          Math.ceil(
            total / pageSize
          ),
      },
    });

  } catch (error) {
    console.error(
      "getPractitioners:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load practitioners",
    });
  }
};


// ======================================================
// GET PRACTITIONER PROFILE
// ======================================================

export const getPractitionerBySlug = async (
  req: Request,
  res: Response
) => {
  try {
    const slug = String(req.params.slug);

    const practitioner =
      await prisma.practitionerProfile.findFirst({
        where: {
          slug,
          approvalStatus:
            "APPROVED",
          isVisible: true,
        },

        select: {
          id: true,
          slug: true,
          practitionerType: true,
          professionalTitle: true,
          shortBio: true,
          about: true,
          profileImageUrl: true,
          experienceYears: true,
          languages: true,
          qualificationSummary: true,
          sessionDurationMinutes: true,
          sessionPrice: true,
          currency: true,
          acceptingNewClients: true,

          user: {
            select: {
              fullName: true,
            },
          },

          specialties: {
            select: {
              specialty: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

    if (!practitioner) {
      return res.status(404).json({
        message:
          "Practitioner not found",
      });
    }

    return res.status(200).json({
      practitioner,
    });

  } catch (error) {
    console.error(
      "getPractitionerBySlug:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load practitioner",
    });
  }
};


// ======================================================
// GET MARKETPLACE SPECIALTIES
// ======================================================

export const getSpecialties = async (
  req: Request,
  res: Response
) => {
  try {
    const specialties =
      await prisma.specialty.findMany({
        where: {
          isActive: true,
        },

        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
      });

    return res.status(200).json({
      specialties,
    });

  } catch (error) {
    console.error(
      "getSpecialties:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load specialties",
    });
  }
};