import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

const buildTrackResponse = (track: any) => ({
  ...track,
  youtubeUrl: track.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${track.youtubeVideoId}`
    : null,
  youtubeEmbedUrl: track.youtubeVideoId
    ? `https://www.youtube.com/embed/${track.youtubeVideoId}?rel=0&playsinline=1`
    : null,
  thumbnailUrl: track.youtubeVideoId
    ? `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`
    : null,
});

// GET /api/sleep-audio/tracks
export const getSleepAudioTracks = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const tracks = await prisma.sleepAudioTrack.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return res.status(200).json({
      status: "success",
      count: tracks.length,
      data: tracks.map(buildTrackResponse),
    });
  } catch (error) {
    console.error("Get sleep audio tracks error:", error);

    return res.status(500).json({
      error: "Failed to fetch sleep audio tracks",
    });
  }
};

// GET /api/sleep-audio/tracks/:slug
export const getSleepAudioTrackBySlug = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const slug = String(req.params.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        error: "Track slug is required",
      });
    }

    const track = await prisma.sleepAudioTrack.findFirst({
      where: {
        slug,
        isActive: true,
      },
    });

    if (!track) {
      return res.status(404).json({
        error: "Sleep audio track not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: buildTrackResponse(track),
    });
  } catch (error) {
    console.error("Get sleep audio track error:", error);

    return res.status(500).json({
      error: "Failed to fetch sleep audio track",
    });
  }
};
