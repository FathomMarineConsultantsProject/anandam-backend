"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeLiveKitRoom = exports.getLiveKitRoomParticipantCount = exports.getLiveKitUrl = exports.createLiveKitParticipantToken = exports.ensureLiveKitRoom = void 0;
const livekit_server_sdk_1 = require("livekit-server-sdk");
// ======================================================
// ENV
// ======================================================
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const assertLiveKitConfig = () => {
    if (!LIVEKIT_URL ||
        !LIVEKIT_API_KEY ||
        !LIVEKIT_API_SECRET) {
        throw new Error("LiveKit environment variables are not configured");
    }
};
// ======================================================
// ROOM SERVICE
// ======================================================
const getRoomService = () => {
    assertLiveKitConfig();
    return new livekit_server_sdk_1.RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
};
// ======================================================
// ENSURE PRIVATE 1-TO-1 ROOM EXISTS
// ======================================================
const ensureLiveKitRoom = async (roomName) => {
    const roomService = getRoomService();
    const rooms = await roomService.listRooms([
        roomName,
    ]);
    if (rooms.length > 0) {
        return rooms[0];
    }
    try {
        return await roomService.createRoom({
            name: roomName,
            // Only normal user + practitioner
            maxParticipants: 2,
            // Room can remain available before
            // the first participant joins.
            emptyTimeout: 10 * 60,
            // Small grace period if both
            // participants disconnect.
            departureTimeout: 60,
            metadata: JSON.stringify({
                application: "ANANDAM",
                type: "PRIVATE_APPOINTMENT",
            }),
        });
    }
    catch (error) {
        /*
          Both participants may request a token
          at nearly the same time.
    
          If another request created the room
          first, simply retrieve it.
        */
        const existingRooms = await roomService.listRooms([
            roomName,
        ]);
        if (existingRooms.length > 0) {
            return existingRooms[0];
        }
        throw error;
    }
};
exports.ensureLiveKitRoom = ensureLiveKitRoom;
// ======================================================
// CREATE PARTICIPANT TOKEN
// ======================================================
const createLiveKitParticipantToken = async ({ roomName, userId, participantName, role, }) => {
    assertLiveKitConfig();
    const token = new livekit_server_sdk_1.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: userId,
        name: participantName,
        // Token only needs to live long
        // enough to enter the room.
        ttl: "15m",
        metadata: JSON.stringify({
            role,
            application: "ANANDAM",
        }),
    });
    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
    });
    return token.toJwt();
};
exports.createLiveKitParticipantToken = createLiveKitParticipantToken;
// ======================================================
// GET LIVEKIT CLIENT URL
// ======================================================
const getLiveKitUrl = () => {
    assertLiveKitConfig();
    return LIVEKIT_URL;
};
exports.getLiveKitUrl = getLiveKitUrl;
// ======================================================
// GET PARTICIPANT COUNT
// ======================================================
const getLiveKitRoomParticipantCount = async (roomName) => {
    const roomService = getRoomService();
    const rooms = await roomService.listRooms([
        roomName,
    ]);
    if (rooms.length === 0) {
        return 0;
    }
    return Number(rooms[0].numParticipants ||
        0);
};
exports.getLiveKitRoomParticipantCount = getLiveKitRoomParticipantCount;
// ======================================================
// DELETE ROOM
// ======================================================
const closeLiveKitRoom = async (roomName) => {
    const roomService = getRoomService();
    const rooms = await roomService.listRooms([
        roomName,
    ]);
    if (rooms.length === 0) {
        return;
    }
    await roomService.deleteRoom(roomName);
};
exports.closeLiveKitRoom = closeLiveKitRoom;
