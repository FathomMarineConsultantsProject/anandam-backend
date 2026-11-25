"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkSession = exports.updateWorkSession = exports.deleteDayComment = exports.updateDayComment = exports.getMyWorkRestHistory = exports.getDailySummary = exports.createManualWorkSession = exports.clockOut = exports.getActiveSession = exports.clockIn = exports.deleteMyDaySlot = exports.updateMyDaySlots = exports.getMyWorkDay = void 0;
const client_1 = require("@prisma/client");
const mlcCompliance_1 = require("../utils/mlcCompliance");
const prisma = new client_1.PrismaClient();
// ======================================================
// CONSTANTS
// ======================================================
const BLOCKS_PER_DAY = 48;
const MINUTES_PER_BLOCK = 30;
// Work/Rest grid is defined in India Standard Time.
// Prisma timestamps remain real UTC instants; only grid projection
// and day-boundary calculations are shifted to IST.
const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;
const DIRECT_EDIT_STATUSES = [
    "REST",
    "MEAL",
    "UNRECORDED",
];
// Internal-only value used for a past-day slot that the user
// explicitly cleared. It prevents the automatic past-day REST
// display rule from turning that slot back into REST.
// This value is never returned to the frontend.
const MANUAL_UNRECORDED_STATUS = "MANUAL_UNRECORDED";
// ======================================================
// HELPERS
// ======================================================
const createEmptyBlocks = () => new Array(BLOCKS_PER_DAY).fill("UNRECORDED");
const normalizeBlocks = (blocks) => {
    if (!Array.isArray(blocks) ||
        blocks.length !== BLOCKS_PER_DAY) {
        return createEmptyBlocks();
    }
    return [...blocks];
};
const normalizeValue = (value) => String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
const getParam = (value) => {
    return Array.isArray(value)
        ? value[0]
        : value;
};
// ======================================================
// DATE HELPERS
// ======================================================
const parseDateOnly = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    if (date.toISOString().slice(0, 10) !==
        value) {
        return null;
    }
    return date;
};
const getDayStart = (date) => {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
};
const addDays = (date, days) => {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
};
// ======================================================
// IST GRID HELPERS
// ======================================================
// DailyWorkHours.date is kept as a logical YYYY-MM-DD value
// stored at 00:00:00Z. The 48 grid slots, however, represent
// 00:00-24:00 IST.
//
// Example:
// 09:34 IST is stored by Prisma as 04:04Z.
// For grid math we shift it to 09:34Z so slot calculations
// land at 09:30 instead of 04:00.
const toIstGridTime = (instant) => new Date(instant.getTime() + IST_OFFSET_MS);
const fromIstGridTime = (gridTime) => new Date(gridTime.getTime() - IST_OFFSET_MS);
const getIstDayBounds = (dayStart) => {
    const gridDayEnd = addDays(dayStart, 1);
    return {
        actualStart: fromIstGridTime(dayStart),
        actualEnd: fromIstGridTime(gridDayEnd),
    };
};
// ======================================================
// AUTO-FINALIZE COMPLETED DAYS
// ======================================================
// Once a day has fully ended, remaining UNRECORDED blocks
// are shown as REST.
//
// If a user later edits/deletes an automatic REST slot, we store
// MANUAL_UNRECORDED internally. That specific slot then stays
// UNRECORDED and is never auto-converted back to REST.
// ======================================================
const isCompletedDay = (dayStart, now = new Date()) => {
    const dayEnd = addDays(dayStart, 1);
    // dayStart/dayEnd are logical IST grid dates encoded at Z.
    // Convert the end of the IST day back to the real UTC instant
    // before comparing with the current time.
    const actualDayEnd = fromIstGridTime(dayEnd);
    return actualDayEnd <= now;
};
const finalizePastDayBlocks = (blocks, dayStart, now = new Date()) => {
    const completedDay = isCompletedDay(dayStart, now);
    return blocks.map((status) => {
        // User explicitly cleared this historical slot.
        // Always expose it as UNRECORDED.
        if (status ===
            MANUAL_UNRECORDED_STATUS) {
            return "UNRECORDED";
        }
        // Only untouched unresolved slots on a completed day
        // are automatically treated as REST.
        if (completedDay &&
            status === "UNRECORDED") {
            return "REST";
        }
        return status;
    });
};
// ======================================================
// SLOT HELPERS
// ======================================================
const getSlotTimeRange = (dayStart, slotIndex) => {
    const gridStart = new Date(dayStart.getTime() +
        slotIndex *
            MINUTES_PER_BLOCK *
            60 *
            1000);
    const gridEnd = new Date(gridStart.getTime() +
        MINUTES_PER_BLOCK *
            60 *
            1000);
    // WorkSession timestamps are real UTC instants, so convert
    // the logical IST slot boundaries back to real UTC instants
    // before performing overlap checks.
    return {
        start: fromIstGridTime(gridStart),
        end: fromIstGridTime(gridEnd),
    };
};
const applyIntervalToBlocks = (blocks, dayStart, intervalStart, intervalEnd, status) => {
    const result = [...blocks];
    const dayEnd = addDays(dayStart, 1);
    const overlapStart = intervalStart > dayStart
        ? intervalStart
        : dayStart;
    const overlapEnd = intervalEnd < dayEnd
        ? intervalEnd
        : dayEnd;
    if (overlapStart >= overlapEnd) {
        return result;
    }
    const startMinutes = (overlapStart.getTime() -
        dayStart.getTime()) /
        60000;
    const endMinutes = (overlapEnd.getTime() -
        dayStart.getTime()) /
        60000;
    const startIndex = Math.max(0, Math.floor(startMinutes /
        MINUTES_PER_BLOCK));
    const endIndex = Math.min(BLOCKS_PER_DAY, Math.ceil(endMinutes /
        MINUTES_PER_BLOCK));
    for (let index = startIndex; index < endIndex; index++) {
        result[index] = status;
    }
    return result;
};
// ======================================================
// WRITE WORK SESSION INTO GRID
// Also supports sessions crossing midnight
// ======================================================
const saveWorkIntervalToGrid = async (userId, startedAt, endedAt) => {
    // Convert real UTC instants into the logical IST grid
    // coordinate system before calculating half-hour slots.
    const gridStartedAt = toIstGridTime(startedAt);
    const gridEndedAt = toIstGridTime(endedAt);
    let dayCursor = getDayStart(gridStartedAt);
    while (dayCursor < gridEndedAt) {
        const existing = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: dayCursor,
                },
            },
        });
        const blocks = normalizeBlocks(existing?.statusBlocks);
        const updated = applyIntervalToBlocks(blocks, dayCursor, gridStartedAt, gridEndedAt, "WORK");
        await prisma.dailyWorkHours.upsert({
            where: {
                userId_date: {
                    userId,
                    date: dayCursor,
                },
            },
            update: {
                statusBlocks: updated,
            },
            create: {
                userId,
                date: dayCursor,
                statusBlocks: updated,
            },
        });
        dayCursor =
            addDays(dayCursor, 1);
    }
};
// ======================================================
// CHECK OVERLAPPING WORK SESSION
// ======================================================
// ======================================================
// FIND EXISTING WORK INSIDE A REQUESTED RANGE
// ======================================================
const findOverlappingSessions = async (userId, start, end) => {
    return prisma.workSession.findMany({
        where: {
            userId,
            startedAt: {
                lt: end,
            },
            OR: [
                {
                    endedAt: null,
                },
                {
                    endedAt: {
                        gt: start,
                    },
                },
            ],
        },
        orderBy: {
            startedAt: "asc",
        },
    });
};
const subtractExistingWork = (requestedStart, requestedEnd, sessions) => {
    let remaining = [
        {
            start: requestedStart,
            end: requestedEnd,
        },
    ];
    const now = new Date();
    const covered = sessions
        .map(session => ({
        start: session.startedAt,
        end: session.endedAt ??
            now,
    }))
        .filter(interval => interval.start <
        requestedEnd &&
        interval.end >
            requestedStart)
        .sort((a, b) => a.start.getTime() -
        b.start.getTime());
    for (const existing of covered) {
        const nextRemaining = [];
        for (const segment of remaining) {
            // No overlap
            if (existing.end <=
                segment.start ||
                existing.start >=
                    segment.end) {
                nextRemaining.push(segment);
                continue;
            }
            // Portion before existing work
            if (existing.start >
                segment.start) {
                nextRemaining.push({
                    start: segment.start,
                    end: existing.start <
                        segment.end
                        ? existing.start
                        : segment.end,
                });
            }
            // Portion after existing work
            if (existing.end <
                segment.end) {
                nextRemaining.push({
                    start: existing.end >
                        segment.start
                        ? existing.end
                        : segment.start,
                    end: segment.end,
                });
            }
        }
        remaining =
            nextRemaining.filter(segment => segment.start <
                segment.end);
    }
    return remaining;
};
// ======================================================
// CHECK REST / MEAL CONFLICTS
// ======================================================
const formatSlotLabel = (slotIndex) => {
    const totalMinutes = slotIndex *
        MINUTES_PER_BLOCK;
    const hour24 = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const meridiem = hour24 >= 12
        ? "PM"
        : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
};
const getNonWorkConflicts = (blocks, startIndex, endIndex) => {
    const conflicts = [];
    for (let index = startIndex; index <
        endIndex; index++) {
        const status = blocks[index];
        if (status === "REST" ||
            status === "MEAL") {
            conflicts.push({
                slotIndex: index,
                time: formatSlotLabel(index),
                status,
            });
        }
    }
    return conflicts;
};
// ======================================================
// BUILD COMPLETE DAY RESPONSE
// ======================================================
const buildDayResponse = async (userId, dayStart) => {
    const { actualStart: actualDayStart, actualEnd: actualDayEnd, } = getIstDayBounds(dayStart);
    const record = await prisma.dailyWorkHours.findUnique({
        where: {
            userId_date: {
                userId,
                date: dayStart,
            },
        },
    });
    let blocks = normalizeBlocks(record?.statusBlocks);
    blocks =
        finalizePastDayBlocks(blocks, dayStart);
    const sessions = await prisma.workSession.findMany({
        where: {
            userId,
            startedAt: {
                lt: actualDayEnd,
            },
            OR: [
                {
                    endedAt: null,
                },
                {
                    endedAt: {
                        gt: actualDayStart,
                    },
                },
            ],
        },
        orderBy: {
            startedAt: "asc",
        },
    });
    /*
      Active sessions are overlaid onto the grid
      even before clock-out.
    */
    const now = new Date();
    const gridNow = toIstGridTime(now);
    /*
      IMPORTANT:
    
      Completed sessions have already been written into
      DailyWorkHours.statusBlocks.
    
      Do NOT overlay completed WorkSession UTC timestamps
      onto the local 48-slot grid again.
    
      Only an ACTIVE clock-in session needs a temporary
      overlay before it has been clocked out.
    */
    for (const session of sessions) {
        if (session.status !== "ACTIVE" ||
            session.endedAt !== null) {
            continue;
        }
        blocks =
            applyIntervalToBlocks(blocks, dayStart, toIstGridTime(session.startedAt), gridNow, "WORK");
    }
    const activeSession = sessions.find((session) => session.status ===
        "ACTIVE" &&
        session.endedAt === null) ?? null;
    return {
        id: record?.id ?? null,
        date: dayStart
            .toISOString()
            .slice(0, 10),
        statusBlocks: blocks,
        commentOfDay: record?.commentOfDay ??
            null,
        sessions,
        activeSession,
        summary: (0, mlcCompliance_1.calculateWorkRestSummary)(blocks),
    };
};
// ======================================================
// GET SELECTED DAY
// GET /api/work-hours/day/:date
// ======================================================
const getMyWorkDay = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized access",
            });
        }
        const dateString = getParam(req.params.date);
        if (!dateString) {
            return res.status(400).json({
                error: "Date is required",
            });
        }
        const date = parseDateOnly(dateString);
        if (!date) {
            return res.status(400).json({
                error: "Invalid date. Use YYYY-MM-DD.",
            });
        }
        const data = await buildDayResponse(userId, date);
        return res.status(200).json({
            status: "success",
            data,
        });
    }
    catch (error) {
        console.error("Get work day error:", error);
        return res.status(500).json({
            error: "Failed to fetch work/rest record",
        });
    }
};
exports.getMyWorkDay = getMyWorkDay;
// ======================================================
// UPDATE REST / MEAL / UNRECORDED SLOTS
// PATCH /api/work-hours/day/:date/slots
// ======================================================
const updateMyDaySlots = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const dateString = getParam(req.params.date);
        if (!dateString) {
            return res.status(400).json({
                error: "Date is required",
            });
        }
        const date = parseDateOnly(dateString);
        if (!date) {
            return res.status(400).json({
                error: "Invalid date. Use YYYY-MM-DD.",
            });
        }
        let updates;
        if (Array.isArray(req.body.updates)) {
            updates =
                req.body.updates.map((item) => ({
                    slotIndex: Number(item.slotIndex),
                    status: normalizeValue(item.status),
                }));
        }
        else {
            updates = [
                {
                    slotIndex: Number(req.body.slotIndex),
                    status: normalizeValue(req.body.status),
                },
            ];
        }
        if (!updates.length) {
            return res.status(400).json({
                error: "At least one slot update is required",
            });
        }
        for (const update of updates) {
            if (!Number.isInteger(update.slotIndex) ||
                update.slotIndex < 0 ||
                update.slotIndex > 47) {
                return res.status(400).json({
                    error: "slotIndex must be between 0 and 47",
                });
            }
            if (!DIRECT_EDIT_STATUSES.includes(update.status)) {
                return res.status(400).json({
                    error: "Slot status must be REST, MEAL or UNRECORDED. Use clock-in/manual work session for WORK.",
                });
            }
        }
        const { actualStart: actualDayStart, actualEnd: actualDayEnd, } = getIstDayBounds(date);
        /*
          Don't allow a REST/MEAL edit over
          an existing work session.
        */
        const workSessions = await prisma.workSession.findMany({
            where: {
                userId,
                startedAt: {
                    lt: actualDayEnd,
                },
                OR: [
                    {
                        endedAt: null,
                    },
                    {
                        endedAt: {
                            gt: actualDayStart,
                        },
                    },
                ],
            },
        });
        for (const update of updates) {
            const slot = getSlotTimeRange(date, update.slotIndex);
            const conflict = workSessions.some((session) => {
                const sessionEnd = session.endedAt ??
                    new Date();
                return (session.startedAt <
                    slot.end &&
                    sessionEnd >
                        slot.start);
            });
            if (conflict) {
                return res.status(409).json({
                    error: `Slot ${update.slotIndex} overlaps an existing work session.`,
                });
            }
        }
        const existing = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
        });
        const blocks = normalizeBlocks(existing?.statusBlocks);
        const completedDay = isCompletedDay(date);
        for (const update of updates) {
            blocks[update.slotIndex] =
                completedDay &&
                    update.status ===
                        "UNRECORDED"
                    ? MANUAL_UNRECORDED_STATUS
                    : update.status;
        }
        await prisma.dailyWorkHours.upsert({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
            update: {
                statusBlocks: blocks,
            },
            create: {
                userId,
                date,
                statusBlocks: blocks,
            },
        });
        const data = await buildDayResponse(userId, date);
        return res.status(200).json({
            status: "success",
            message: "Work/rest record updated",
            data,
        });
    }
    catch (error) {
        console.error("Update slots error:", error);
        return res.status(500).json({
            error: "Failed to update work/rest record",
        });
    }
};
exports.updateMyDaySlots = updateMyDaySlots;
// ======================================================
// DELETE ONE REST / MEAL SLOT
// DELETE /api/work-hours/day/:date/slots/:slotIndex
// ======================================================
const deleteMyDaySlot = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const dateString = getParam(req.params.date);
        const slotIndexString = getParam(req.params.slotIndex);
        if (!dateString ||
            slotIndexString === undefined) {
            return res.status(400).json({
                error: "Date and slotIndex are required",
            });
        }
        const date = parseDateOnly(dateString);
        if (!date) {
            return res.status(400).json({
                error: "Invalid date. Use YYYY-MM-DD.",
            });
        }
        const slotIndex = Number(slotIndexString);
        if (!Number.isInteger(slotIndex) ||
            slotIndex < 0 ||
            slotIndex > 47) {
            return res.status(400).json({
                error: "slotIndex must be between 0 and 47",
            });
        }
        const existing = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
        });
        const blocks = normalizeBlocks(existing?.statusBlocks);
        /*
          WORK is linked to WorkSession.
          It must therefore be deleted through
          DELETE /sessions/:sessionId.
        */
        if (blocks[slotIndex] ===
            "WORK") {
            return res.status(409).json({
                error: "Work time must be deleted through its work session.",
            });
        }
        blocks[slotIndex] =
            isCompletedDay(date)
                ? MANUAL_UNRECORDED_STATUS
                : "UNRECORDED";
        await prisma.dailyWorkHours.upsert({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
            update: {
                statusBlocks: blocks,
            },
            create: {
                userId,
                date,
                statusBlocks: blocks,
            },
        });
        const data = await buildDayResponse(userId, date);
        return res.status(200).json({
            status: "success",
            message: "Slot deleted successfully",
            data,
        });
    }
    catch (error) {
        console.error("Delete slot error:", error);
        return res.status(500).json({
            error: "Failed to delete slot",
        });
    }
};
exports.deleteMyDaySlot = deleteMyDaySlot;
// ======================================================
// CLOCK IN
// POST /api/work-hours/sessions/clock-in
// ======================================================
const clockIn = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const shipLocation = String(req.body.shipLocation ??
            "").trim();
        if (!shipLocation) {
            return res.status(400).json({
                error: "Ship location is required",
            });
        }
        if (shipLocation.length > 100) {
            return res.status(400).json({
                error: "Ship location cannot exceed 100 characters",
            });
        }
        const active = await prisma.workSession.findFirst({
            where: {
                userId,
                status: "ACTIVE",
                endedAt: null,
            },
        });
        if (active) {
            return res.status(409).json({
                error: "You already have an active work session",
                data: active,
            });
        }
        const session = await prisma.workSession.create({
            data: {
                userId,
                shipLocation,
                startedAt: new Date(),
                source: "LIVE",
                status: "ACTIVE",
            },
        });
        return res.status(201).json({
            status: "success",
            message: `Clocked in at ${shipLocation}`,
            data: session,
        });
    }
    catch (error) {
        console.error("Clock in error:", error);
        return res.status(500).json({
            error: "Failed to clock in",
        });
    }
};
exports.clockIn = clockIn;
// ======================================================
// ACTIVE SESSION
// GET /api/work-hours/sessions/active
// ======================================================
const getActiveSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized access",
            });
        }
        const session = await prisma.workSession.findFirst({
            where: {
                userId,
                status: "ACTIVE",
                endedAt: null,
            },
            orderBy: {
                startedAt: "desc",
            },
        });
        return res.status(200).json({
            status: "success",
            data: session,
        });
    }
    catch (error) {
        console.error("Active session error:", error);
        return res.status(500).json({
            error: "Failed to fetch active session",
        });
    }
};
exports.getActiveSession = getActiveSession;
// ======================================================
// CLOCK OUT
// POST /api/work-hours/sessions/clock-out
// ======================================================
const clockOut = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const session = await prisma.workSession.findFirst({
            where: {
                userId,
                status: "ACTIVE",
                endedAt: null,
            },
        });
        if (!session) {
            return res.status(400).json({
                error: "No active work session found",
            });
        }
        const endedAt = new Date();
        const completed = await prisma.workSession.update({
            where: {
                id: session.id,
            },
            data: {
                endedAt,
                status: "COMPLETED",
            },
        });
        await saveWorkIntervalToGrid(userId, session.startedAt, endedAt);
        return res.status(200).json({
            status: "success",
            message: "Clocked out successfully",
            data: completed,
        });
    }
    catch (error) {
        console.error("Clock out error:", error);
        return res.status(500).json({
            error: "Failed to clock out",
        });
    }
};
exports.clockOut = clockOut;
// ======================================================
// MANUAL / MISSED WORK SESSION
// POST /api/work-hours/sessions/manual
// ======================================================
const createManualWorkSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const { startedAt, endedAt, shipLocation, 
        // Frontend local-grid information
        selectedDate, startSlotIndex, endSlotIndex, timezoneOffsetMinutes, } = req.body;
        // ==================================================
        // BASIC VALIDATION
        // ==================================================
        if (!startedAt ||
            !endedAt ||
            !shipLocation) {
            return res.status(400).json({
                error: "startedAt, endedAt and shipLocation are required",
            });
        }
        const start = new Date(startedAt);
        const end = new Date(endedAt);
        if (Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())) {
            return res.status(400).json({
                error: "Invalid start/end date",
            });
        }
        if (start >= end) {
            return res.status(400).json({
                error: "End time must be after start time",
            });
        }
        if (end >
            new Date()) {
            return res.status(400).json({
                error: "Manual work session cannot end in the future",
            });
        }
        const location = String(shipLocation).trim();
        if (!location) {
            return res.status(400).json({
                error: "Ship location is required",
            });
        }
        if (location.length >
            100) {
            return res.status(400).json({
                error: "Ship location cannot exceed 100 characters",
            });
        }
        // ==================================================
        // LOCAL GRID VALIDATION
        // ==================================================
        const hasGridMetadata = selectedDate !== undefined ||
            startSlotIndex !== undefined ||
            endSlotIndex !== undefined;
        let gridDate = null;
        let gridStartIndex = null;
        let gridEndIndex = null;
        if (hasGridMetadata) {
            if (typeof selectedDate !==
                "string") {
                return res.status(400).json({
                    error: "selectedDate is required for a manual grid entry",
                });
            }
            gridDate =
                parseDateOnly(selectedDate);
            if (!gridDate) {
                return res.status(400).json({
                    error: "Invalid selectedDate. Use YYYY-MM-DD.",
                });
            }
            gridStartIndex =
                Number(startSlotIndex);
            gridEndIndex =
                Number(endSlotIndex);
            if (!Number.isInteger(gridStartIndex) ||
                !Number.isInteger(gridEndIndex) ||
                gridStartIndex < 0 ||
                gridStartIndex > 47 ||
                gridEndIndex < 1 ||
                gridEndIndex > 48 ||
                gridEndIndex <=
                    gridStartIndex) {
                return res.status(400).json({
                    error: "Invalid manual work slot range",
                });
            }
        }
        if (timezoneOffsetMinutes !==
            undefined &&
            !Number.isFinite(Number(timezoneOffsetMinutes))) {
            return res.status(400).json({
                error: "Invalid timezone offset",
            });
        }
        // ==================================================
        // REST / MEAL ARE REAL CONFLICTS
        //
        // Existing WORK is NOT considered a conflict.
        // ==================================================
        if (gridDate &&
            gridStartIndex !== null &&
            gridEndIndex !== null) {
            const existingGrid = await prisma.dailyWorkHours.findUnique({
                where: {
                    userId_date: {
                        userId,
                        date: gridDate,
                    },
                },
            });
            const rawBlocks = normalizeBlocks(existingGrid
                ?.statusBlocks);
            const blocks = finalizePastDayBlocks(rawBlocks, gridDate);
            const conflicts = getNonWorkConflicts(blocks, gridStartIndex, gridEndIndex);
            if (conflicts.length >
                0) {
                return res.status(409).json({
                    status: "conflict",
                    code: "REST_MEAL_CONFLICT",
                    error: "Selected work time overlaps a Rest or Meal/Tea/Break period.",
                    message: "Work cannot be added over Rest or Meal/Tea/Break. Change those slots first or choose a different time.",
                    conflicts,
                });
            }
        }
        // ==================================================
        // EXISTING WORK IS ALLOWED
        //
        // Find what parts are already work.
        // ==================================================
        const overlappingSessions = await findOverlappingSessions(userId, start, end);
        const missingWorkSegments = subtractExistingWork(start, end, overlappingSessions);
        const createdSessions = [];
        // ==================================================
        // NEW FRONTEND
        //
        // Session + local grid saved atomically.
        // ==================================================
        if (gridDate &&
            gridStartIndex !== null &&
            gridEndIndex !== null) {
            const created = await prisma.$transaction(async (tx) => {
                const newSessions = [];
                // Only save portions that are not
                // already recorded as WORK.
                for (const segment of missingWorkSegments) {
                    const session = await tx.workSession.create({
                        data: {
                            userId,
                            shipLocation: location,
                            startedAt: segment.start,
                            endedAt: segment.end,
                            source: "MANUAL",
                            status: "COMPLETED",
                        },
                    });
                    newSessions.push(session);
                }
                // ------------------------------------------
                // GRID
                // ------------------------------------------
                const existingGrid = await tx.dailyWorkHours.findUnique({
                    where: {
                        userId_date: {
                            userId,
                            date: gridDate,
                        },
                    },
                });
                const blocks = normalizeBlocks(existingGrid
                    ?.statusBlocks);
                /*
                  We already checked REST / MEAL above.
  
                  Therefore all selected slots may safely
                  become WORK.
  
                  Existing WORK simply stays WORK.
                */
                for (let index = gridStartIndex; index <
                    gridEndIndex; index++) {
                    blocks[index] =
                        "WORK";
                }
                await tx.dailyWorkHours.upsert({
                    where: {
                        userId_date: {
                            userId,
                            date: gridDate,
                        },
                    },
                    update: {
                        statusBlocks: blocks,
                    },
                    create: {
                        userId,
                        date: gridDate,
                        statusBlocks: blocks,
                    },
                });
                return newSessions;
            });
            createdSessions.push(...created);
        }
        else {
            // =================================================
            // OLD CLIENT COMPATIBILITY
            // =================================================
            for (const segment of missingWorkSegments) {
                const session = await prisma.workSession.create({
                    data: {
                        userId,
                        shipLocation: location,
                        startedAt: segment.start,
                        endedAt: segment.end,
                        source: "MANUAL",
                        status: "COMPLETED",
                    },
                });
                createdSessions.push(session);
                await saveWorkIntervalToGrid(userId, segment.start, segment.end);
            }
        }
        // ==================================================
        // RESPONSE
        // ==================================================
        const alreadyRecorded = overlappingSessions.length >
            0 &&
            missingWorkSegments.length ===
                0;
        const extendedExistingWork = overlappingSessions.length >
            0 &&
            missingWorkSegments.length >
                0;
        let code = "WORK_SESSION_CREATED";
        let message = "Manual work session saved";
        if (alreadyRecorded) {
            code =
                "WORK_ALREADY_RECORDED";
            message =
                "This selected time is already recorded as work. No duplicate work session was created.";
        }
        else if (extendedExistingWork) {
            code =
                "WORK_SESSION_EXTENDED";
            message =
                "Part of this time was already recorded as work. The existing work was kept and only the remaining time was added.";
        }
        const refreshedDay = gridDate
            ? await buildDayResponse(userId, gridDate)
            : null;
        /*
          Preserve the old "data" field so existing
          frontend code does not suddenly break.
        */
        const primarySession = createdSessions[0] ??
            overlappingSessions[0] ??
            null;
        return res.status(createdSessions.length >
            0
            ? 201
            : 200).json({
            status: "success",
            code,
            message,
            data: primarySession,
            meta: {
                createdCount: createdSessions.length,
                existingWorkDetected: overlappingSessions.length >
                    0,
                alreadyRecorded,
                extendedExistingWork,
                createdSessions,
                existingWorkSessions: overlappingSessions,
            },
            day: refreshedDay,
        });
    }
    catch (error) {
        console.error("Manual work session error:", error);
        return res.status(500).json({
            error: "Failed to save manual work session",
        });
    }
};
exports.createManualWorkSession = createManualWorkSession;
// ======================================================
// DAILY SUMMARY
// GET /api/work-hours/summary/:date
// ======================================================
const getDailySummary = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const dateString = getParam(req.params.date);
        if (!dateString) {
            return res.status(400).json({
                error: "Date is required",
            });
        }
        const date = parseDateOnly(dateString);
        if (!date) {
            return res.status(400).json({
                error: "Invalid date. Use YYYY-MM-DD.",
            });
        }
        const day = await buildDayResponse(userId, date);
        return res.status(200).json({
            status: "success",
            data: {
                date: day.date,
                ...day.summary,
            },
        });
    }
    catch (error) {
        console.error("Summary error:", error);
        return res.status(500).json({
            error: "Failed to calculate summary",
        });
    }
};
exports.getDailySummary = getDailySummary;
// ======================================================
// HISTORY
// GET /api/work-hours/history
// ======================================================
const getMyWorkRestHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const records = await prisma.dailyWorkHours.findMany({
            where: {
                userId,
            },
            orderBy: {
                date: "desc",
            },
            take: 90,
        });
        const data = records.map((record) => {
            let blocks = normalizeBlocks(record.statusBlocks);
            blocks =
                finalizePastDayBlocks(blocks, record.date);
            return {
                id: record.id,
                date: record.date
                    .toISOString()
                    .slice(0, 10),
                statusBlocks: blocks,
                summary: (0, mlcCompliance_1.calculateWorkRestSummary)(blocks),
            };
        });
        return res.status(200).json({
            status: "success",
            count: data.length,
            data,
        });
    }
    catch (error) {
        console.error("History error:", error);
        return res.status(500).json({
            error: "Failed to fetch work/rest history",
        });
    }
};
exports.getMyWorkRestHistory = getMyWorkRestHistory;
// ======================================================
// UPDATE COMMENT OF THE DAY
// PATCH /api/work-hours/day/:date/comment
// ======================================================
const updateDayComment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const dateString = getParam(req.params.date);
        if (!dateString) {
            return res.status(400).json({
                error: "Date is required",
            });
        }
        const date = parseDateOnly(dateString);
        if (!date) {
            return res.status(400).json({
                error: "Invalid date. Use YYYY-MM-DD.",
            });
        }
        const comment = String(req.body.comment ?? "").trim();
        if (!comment) {
            return res.status(400).json({
                error: "Comment cannot be empty",
            });
        }
        if (comment.length > 1000) {
            return res.status(400).json({
                error: "Comment cannot exceed 1000 characters",
            });
        }
        await prisma.dailyWorkHours.upsert({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
            update: {
                commentOfDay: comment,
            },
            create: {
                userId,
                date,
                statusBlocks: createEmptyBlocks(),
                commentOfDay: comment,
            },
        });
        const data = await buildDayResponse(userId, date);
        return res.status(200).json({
            status: "success",
            message: "Comment updated successfully",
            data,
        });
    }
    catch (error) {
        console.error("Update day comment error:", error);
        return res.status(500).json({
            error: "Failed to update comment",
        });
    }
};
exports.updateDayComment = updateDayComment;
// ======================================================
// DELETE COMMENT OF THE DAY
// DELETE /api/work-hours/day/:date/comment
// ======================================================
const deleteDayComment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const dateString = getParam(req.params.date);
        if (!dateString) {
            return res.status(400).json({
                error: "Date is required",
            });
        }
        const date = parseDateOnly(dateString);
        if (!date) {
            return res.status(400).json({
                error: "Invalid date. Use YYYY-MM-DD.",
            });
        }
        const existing = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
        });
        if (!existing) {
            return res.status(404).json({
                error: "Work/rest record not found",
            });
        }
        await prisma.dailyWorkHours.update({
            where: {
                userId_date: {
                    userId,
                    date,
                },
            },
            data: {
                commentOfDay: null,
            },
        });
        const data = await buildDayResponse(userId, date);
        return res.status(200).json({
            status: "success",
            message: "Comment deleted successfully",
            data,
        });
    }
    catch (error) {
        console.error("Delete day comment error:", error);
        return res.status(500).json({
            error: "Failed to delete comment",
        });
    }
};
exports.deleteDayComment = deleteDayComment;
// ======================================================
// UPDATE COMPLETED WORK SESSION
// PATCH /api/work-hours/sessions/:sessionId
// ======================================================
const updateWorkSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const sessionId = getParam(req.params.sessionId);
        if (!sessionId) {
            return res.status(400).json({
                error: "sessionId is required",
            });
        }
        const existingSession = await prisma.workSession.findFirst({
            where: {
                id: sessionId,
                userId,
            },
        });
        if (!existingSession) {
            return res.status(404).json({
                error: "Work session not found",
            });
        }
        if (existingSession.status ===
            "ACTIVE" ||
            existingSession.endedAt ===
                null) {
            return res.status(409).json({
                error: "An active work session cannot be edited. Clock out first.",
            });
        }
        const { startedAt, endedAt, shipLocation, selectedDate, oldStartSlotIndex, oldEndSlotIndex, startSlotIndex, endSlotIndex, } = req.body;
        const start = startedAt
            ? new Date(startedAt)
            : existingSession.startedAt;
        const end = endedAt
            ? new Date(endedAt)
            : existingSession.endedAt;
        if (!end ||
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())) {
            return res.status(400).json({
                error: "Invalid start/end date",
            });
        }
        if (start >= end) {
            return res.status(400).json({
                error: "End time must be after start time",
            });
        }
        if (end >
            new Date()) {
            return res.status(400).json({
                error: "Work session cannot end in the future",
            });
        }
        const location = shipLocation !== undefined
            ? String(shipLocation).trim()
            : existingSession.shipLocation;
        if (!location) {
            return res.status(400).json({
                error: "Ship location is required",
            });
        }
        if (location.length > 100) {
            return res.status(400).json({
                error: "Ship location cannot exceed 100 characters",
            });
        }
        const gridDate = typeof selectedDate ===
            "string"
            ? parseDateOnly(selectedDate)
            : null;
        if (!gridDate) {
            return res.status(400).json({
                error: "selectedDate is required. Use YYYY-MM-DD.",
            });
        }
        const oldStart = Number(oldStartSlotIndex);
        const oldEnd = Number(oldEndSlotIndex);
        const newStart = Number(startSlotIndex);
        const newEnd = Number(endSlotIndex);
        const validRange = (startIndex, endIndex) => Number.isInteger(startIndex) &&
            Number.isInteger(endIndex) &&
            startIndex >= 0 &&
            startIndex <= 47 &&
            endIndex >= 1 &&
            endIndex <= 48 &&
            endIndex >
                startIndex;
        if (!validRange(oldStart, oldEnd) ||
            !validRange(newStart, newEnd)) {
            return res.status(400).json({
                error: "Invalid work slot range",
            });
        }
        /*
          Prevent two independent WorkSession records
          occupying the same real interval.
        */
        const overlappingSession = await prisma.workSession.findFirst({
            where: {
                userId,
                id: {
                    not: sessionId,
                },
                startedAt: {
                    lt: end,
                },
                OR: [
                    {
                        endedAt: null,
                    },
                    {
                        endedAt: {
                            gt: start,
                        },
                    },
                ],
            },
        });
        if (overlappingSession) {
            return res.status(409).json({
                status: "conflict",
                code: "WORK_SESSION_CONFLICT",
                error: "The updated time overlaps another work session.",
            });
        }
        const existingGrid = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: gridDate,
                },
            },
        });
        const blocks = normalizeBlocks(existingGrid
            ?.statusBlocks);
        // Build the conflict view BEFORE clearing the old work range.
        // Existing WORK is not a REST/MEAL conflict, while untouched
        // past-day UNRECORDED slots are treated as automatic REST.
        const conflictBlocks = finalizePastDayBlocks(blocks, gridDate);
        /*
          Remove the old visual work range first.
        */
        for (let index = oldStart; index <
            oldEnd; index++) {
            if (blocks[index] ===
                "WORK") {
                blocks[index] =
                    "UNRECORDED";
            }
        }
        /*
          New WORK cannot replace REST or MEAL.
        */
        const conflicts = getNonWorkConflicts(conflictBlocks, newStart, newEnd);
        if (conflicts.length > 0) {
            return res.status(409).json({
                status: "conflict",
                code: "REST_MEAL_CONFLICT",
                error: "Selected work time overlaps a Rest or Meal period.",
                conflicts,
            });
        }
        for (let index = newStart; index <
            newEnd; index++) {
            blocks[index] =
                "WORK";
        }
        const updatedSession = await prisma.$transaction(async (tx) => {
            const updated = await tx.workSession.update({
                where: {
                    id: sessionId,
                },
                data: {
                    startedAt: start,
                    endedAt: end,
                    shipLocation: location,
                    status: "COMPLETED",
                },
            });
            await tx.dailyWorkHours.upsert({
                where: {
                    userId_date: {
                        userId,
                        date: gridDate,
                    },
                },
                update: {
                    statusBlocks: blocks,
                },
                create: {
                    userId,
                    date: gridDate,
                    statusBlocks: blocks,
                },
            });
            return updated;
        });
        const day = await buildDayResponse(userId, gridDate);
        return res.status(200).json({
            status: "success",
            message: "Work session updated successfully",
            data: updatedSession,
            day,
        });
    }
    catch (error) {
        console.error("Update work session error:", error);
        return res.status(500).json({
            error: "Failed to update work session",
        });
    }
};
exports.updateWorkSession = updateWorkSession;
// ======================================================
// DELETE COMPLETED WORK SESSION
// DELETE /api/work-hours/sessions/:sessionId
// ======================================================
const deleteWorkSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const sessionId = getParam(req.params.sessionId);
        if (!sessionId) {
            return res.status(400).json({
                error: "sessionId is required",
            });
        }
        const session = await prisma.workSession.findFirst({
            where: {
                id: sessionId,
                userId,
            },
        });
        if (!session) {
            return res.status(404).json({
                error: "Work session not found",
            });
        }
        if (session.status ===
            "ACTIVE" ||
            session.endedAt ===
                null) {
            return res.status(409).json({
                error: "An active work session cannot be deleted. Clock out first.",
            });
        }
        const { selectedDate, startSlotIndex, endSlotIndex, } = req.body;
        const gridDate = typeof selectedDate ===
            "string"
            ? parseDateOnly(selectedDate)
            : null;
        if (!gridDate) {
            return res.status(400).json({
                error: "selectedDate is required. Use YYYY-MM-DD.",
            });
        }
        const startIndex = Number(startSlotIndex);
        const endIndex = Number(endSlotIndex);
        if (!Number.isInteger(startIndex) ||
            !Number.isInteger(endIndex) ||
            startIndex < 0 ||
            startIndex > 47 ||
            endIndex < 1 ||
            endIndex > 48 ||
            endIndex <=
                startIndex) {
            return res.status(400).json({
                error: "Invalid work slot range",
            });
        }
        const existingGrid = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: gridDate,
                },
            },
        });
        const blocks = normalizeBlocks(existingGrid
            ?.statusBlocks);
        for (let index = startIndex; index <
            endIndex; index++) {
            if (blocks[index] ===
                "WORK") {
                blocks[index] =
                    "UNRECORDED";
            }
        }
        await prisma.$transaction(async (tx) => {
            await tx.workSession.delete({
                where: {
                    id: sessionId,
                },
            });
            await tx.dailyWorkHours.upsert({
                where: {
                    userId_date: {
                        userId,
                        date: gridDate,
                    },
                },
                update: {
                    statusBlocks: blocks,
                },
                create: {
                    userId,
                    date: gridDate,
                    statusBlocks: blocks,
                },
            });
        });
        const day = await buildDayResponse(userId, gridDate);
        return res.status(200).json({
            status: "success",
            message: "Work session deleted successfully",
            day,
        });
    }
    catch (error) {
        console.error("Delete work session error:", error);
        return res.status(500).json({
            error: "Failed to delete work session",
        });
    }
};
exports.deleteWorkSession = deleteWorkSession;
// ============Total endpoints API==================
//   // GET     /api/work-hours/day/:date
// PATCH   /api/work-hours/day/:date/slots
// DELETE  /api/work-hours/day/:date/slots/:slotIndex
// PATCH   /api/work-hours/day/:date/comment
// DELETE  /api/work-hours/day/:date/comment
// GET     /api/work-hours/sessions/active
// POST    /api/work-hours/sessions/clock-in
// POST    /api/work-hours/sessions/clock-out
// POST    /api/work-hours/sessions/manual
// PATCH   /api/work-hours/sessions/:sessionId
// DELETE  /api/work-hours/sessions/:sessionId
// GET     /api/work-hours/summary/:date
// GET     /api/work-hours/history
