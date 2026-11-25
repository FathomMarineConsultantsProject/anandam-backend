"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBreathingTracks = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ======================================================
// GET BACKGROUND AUDIO TRACKS
// GET /api/breathing/tracks
// ======================================================
const getBreathingTracks = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res
                .status(401)
                .json({
                error: "Unauthorized",
            });
        }
        const tracks = await prisma
            .breathingAudioTrack
            .findMany({
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
        return res
            .status(200)
            .json({
            status: "success",
            count: tracks.length,
            data: tracks,
        });
    }
    catch (error) {
        console.error("Breathing tracks error:", error);
        return res
            .status(500)
            .json({
            error: "Failed to load breathing audio",
        });
    }
};
exports.getBreathingTracks = getBreathingTracks;
