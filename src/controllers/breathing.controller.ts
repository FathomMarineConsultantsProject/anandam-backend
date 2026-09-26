import {
  Response,
} from "express";

import {
  PrismaClient,
} from "@prisma/client";

import {
  AuthRequest,
} from "../middleware/auth.middleware";


const prisma =
  new PrismaClient();


// ======================================================
// GET BACKGROUND AUDIO TRACKS
// GET /api/breathing/tracks
// ======================================================

export const getBreathingTracks =
  async (
    req: AuthRequest,
    res: Response
  ): Promise<any> => {

    try {

      const userId =
        req.user?.userId;


      if (!userId) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized",
          });
      }


      const tracks =
        await prisma
          .breathingAudioTrack
          .findMany({

            where: {
              isActive:
                true,
            },

            orderBy: [
              {
                sortOrder:
                  "asc",
              },

              {
                createdAt:
                  "asc",
              },
            ],
          });


      return res
        .status(200)
        .json({

          status:
            "success",

          count:
            tracks.length,

          data:
            tracks,
        });

    } catch (error) {

      console.error(
        "Breathing tracks error:",
        error
      );


      return res
        .status(500)
        .json({
          error:
            "Failed to load breathing audio",
        });
    }
  };