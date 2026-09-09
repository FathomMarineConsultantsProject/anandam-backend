import { Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();


// ======================================================
// HELPER - PARSE OPTIONAL DATE
// ======================================================

const parseOptionalDate = (
  value: unknown
): Date | null | undefined => {
  // Field was not sent at all -> don't update it
  if (value === undefined) {
    return undefined;
  }

  // Empty value/null -> clear existing date
  if (value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return date;
};


// ======================================================
// UPDATE PROFILE
// ======================================================

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized access",
      });
    }

    const {
      fullName,
      email,
      rank,
      vessel,

      contractStart,
      contractEnd,

      contactNumber,

      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactNumber,

      homeCountry,

      avatarMode,
      avatarId,
    } = req.body;


    // ==================================================
    // EMAIL NORMALIZATION
    // ==================================================

    const normalizedEmail =
      email !== undefined
        ? String(email).trim().toLowerCase()
        : undefined;

    if (
      normalizedEmail !== undefined &&
      !normalizedEmail
    ) {
      return res.status(400).json({
        error: "Email cannot be empty",
      });
    }


    // ==================================================
    // AVATAR VALIDATION
    // ==================================================

    if (
      avatarMode !== undefined &&
      !["INITIALS", "AVATAR"].includes(avatarMode)
    ) {
      return res.status(400).json({
        error:
          "avatarMode must be either INITIALS or AVATAR",
      });
    }

    if (
      avatarMode === "AVATAR" &&
      !avatarId
    ) {
      return res.status(400).json({
        error:
          "avatarId is required when avatarMode is AVATAR",
      });
    }


    // ==================================================
    // DATE VALIDATION
    // ==================================================

    let parsedContractStart:
      | Date
      | null
      | undefined;

    let parsedContractEnd:
      | Date
      | null
      | undefined;

    try {
      parsedContractStart =
        parseOptionalDate(contractStart);

      parsedContractEnd =
        parseOptionalDate(contractEnd);
    } catch {
      return res.status(400).json({
        error: "Invalid contract date",
      });
    }


    // ==================================================
    // UPDATE USER
    // ==================================================

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        fullName,
        email: normalizedEmail,

        rank,
        vessel,

        contractStart: parsedContractStart,
        contractEnd: parsedContractEnd,

        contactNumber,

        emergencyContactName,
        emergencyContactRelationship,
        emergencyContactNumber,

        homeCountry,

        avatarMode,

        /*
          If user clicks "Use Initials",
          remove the previously selected avatar.
        */
        avatarId:
          avatarMode === "INITIALS"
            ? null
            : avatarId,
      },

      select: {
        id: true,

        fullName: true,
        email: true,

        contactNumber: true,

        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactNumber: true,

        contractStart: true,
        contractEnd: true,

        vessel: true,
        rank: true,

        homeCountry: true,

        avatarMode: true,
        avatarId: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: updatedUser,
    });

  } catch (error) {

    // Duplicate email
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error:
          "This email address is already in use",
      });
    }

    console.error(
      "Update profile error:",
      error
    );

    return res.status(500).json({
      error: "Failed to update profile",
    });
  }
};


// ======================================================
// GET MY PROFILE
// ======================================================

export const getMyProfile = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized access",
      });
    }

    const userProfile =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,

          fullName: true,
          email: true,

          contactNumber: true,

          emergencyContactName: true,
          emergencyContactRelationship: true,
          emergencyContactNumber: true,

          contractStart: true,
          contractEnd: true,

          vessel: true,
          rank: true,

          homeCountry: true,

          avatarMode: true,
          avatarId: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    if (!userProfile) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: userProfile,
    });

  } catch (error) {
    console.error(
      "Fetch profile error:",
      error
    );

    return res.status(500).json({
      error: "Failed to fetch profile",
    });
  }
};