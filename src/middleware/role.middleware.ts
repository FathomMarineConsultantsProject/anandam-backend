import {
  NextFunction,
  Response,
} from "express";

import {
  PrismaClient,
  UserRole,
} from "@prisma/client";

import {
  AuthRequest,
} from "./auth.middleware";


const prisma =
  new PrismaClient();


export const requireRole =
  (
    ...allowedRoles: UserRole[]
  ) =>
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    try {
      const userId =
        req.user?.userId;


      if (!userId) {
        return res.status(401).json({
          message:
            "Unauthorized",
        });
      }


      const user =
        await prisma.user.findUnique({
          where: {
            id:
              userId,
          },

          select: {
            role:
              true,
          },
        });


      if (!user) {
        return res.status(401).json({
          message:
            "User not found",
        });
      }


      if (
        !allowedRoles.includes(
          user.role
        )
      ) {
        return res.status(403).json({
          message:
            "You do not have permission to access this resource",
        });
      }


      return next();

    } catch (error) {
      console.error(
        "requireRole:",
        error
      );


      return res.status(500).json({
        message:
          "Unable to verify permissions",
      });
    }
  };