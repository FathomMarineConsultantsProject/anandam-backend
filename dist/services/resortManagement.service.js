"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeReservations = exports.addDays = exports.dayKey = exports.ResortApiError = exports.prisma = void 0;
exports.guarded = guarded;
exports.transaction = transaction;
exports.ownedProperty = ownedProperty;
exports.ownedEvent = ownedEvent;
exports.requiredText = requiredText;
exports.optionalText = optionalText;
exports.wholeNumber = wholeNumber;
exports.parseDate = parseDate;
exports.dateRange = dateRange;
exports.parseDateTime = parseDateTime;
exports.validTimeZone = validTimeZone;
exports.localDate = localDate;
exports.eventNights = eventNights;
exports.bookingRef = bookingRef;
exports.roomTypeFor = roomTypeFor;
exports.roomUnitFor = roomUnitFor;
exports.overlap = overlap;
exports.ensureAvailable = ensureAvailable;
exports.ensureUnitFree = ensureUnitFree;
exports.isPublished = isPublished;
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
exports.prisma = new client_1.PrismaClient();
class ResortApiError extends Error {
    statusCode;
    code;
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "ResortApiError";
    }
}
exports.ResortApiError = ResortApiError;
function guarded(fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        }
        catch (error) {
            if (res.headersSent)
                return;
            if (error instanceof ResortApiError) {
                res.status(error.statusCode).json({ status: "error", code: error.code, message: error.message });
                return;
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === "P2002") {
                    res.status(409).json({ status: "error", code: "DUPLICATE", message: "This record already exists." });
                    return;
                }
                if (error.code === "P2003" || error.code === "P2014") {
                    res.status(409).json({ status: "error", code: "RECORD_IN_USE", message: "The record is currently in use and cannot be removed." });
                    return;
                }
            }
            console.error("Resort management error:", error);
            res.status(500).json({ status: "error", code: "RESORT_MANAGEMENT_ERROR", message: "Unable to complete this resort request." });
        }
    };
}
async function transaction(run) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await exports.prisma.$transaction(run, {
                isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
                timeout: 20000,
            });
        }
        catch (error) {
            if (attempt < 2 &&
                error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2034")
                continue;
            throw error;
        }
    }
    throw new ResortApiError(409, "CONCURRENT_UPDATE", "Please retry this request.");
}
async function ownedProperty(req) {
    const userId = req.user?.userId;
    if (!userId)
        throw new ResortApiError(401, "UNAUTHORIZED", "Please sign in.");
    const property = await exports.prisma.resortProperty.findFirst({
        where: { id: String(req.params.propertyId || ""), owner: { userId } },
        select: { id: true, name: true, status: true, onboardingCompleted: true },
    });
    if (!property)
        throw new ResortApiError(404, "PROPERTY_NOT_FOUND", "Property not found.");
    return property;
}
async function ownedEvent(req, eventId) {
    const property = await ownedProperty(req);
    const event = await exports.prisma.resortEvent.findFirst({
        where: { id: eventId, propertyId: property.id },
    });
    if (!event)
        throw new ResortApiError(404, "EVENT_NOT_FOUND", "Event or retreat not found.");
    return { property, event };
}
function requiredText(v, name, maxLength = 500) {
    if (typeof v !== "string" || !v.trim() || v.trim().length > maxLength) {
        throw new ResortApiError(422, "INVALID_FIELD", `${name} is required (maximum ${maxLength} characters).`);
    }
    return v.trim();
}
function optionalText(v, name, maxLength = 10000) {
    if (v === null || v === undefined || v === "")
        return null;
    if (typeof v !== "string" || v.length > maxLength) {
        throw new ResortApiError(422, "INVALID_FIELD", `${name} must be text (maximum ${maxLength} characters).`);
    }
    return v.trim() || null;
}
function wholeNumber(v, name, min, max) {
    const n = Number(v);
    if (v === "" || v === null || v === undefined || !Number.isSafeInteger(n) || n < min || n > max) {
        throw new ResortApiError(422, "INVALID_FIELD", `${name} must be a whole number between ${min} and ${max}.`);
    }
    return n;
}
const DAY = 86400000;
function parseDate(v, name = "date") {
    if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        throw new ResortApiError(422, "INVALID_DATE", `${name} must use YYYY-MM-DD format.`);
    }
    const d = new Date(`${v}T00:00:00.000Z`);
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
        throw new ResortApiError(422, "INVALID_DATE", `${name} is not a valid calendar date.`);
    }
    return d;
}
const dayKey = (date) => date.toISOString().slice(0, 10);
exports.dayKey = dayKey;
const addDays = (d, n) => new Date(d.getTime() + n * DAY);
exports.addDays = addDays;
function dateRange(from, untilExclusive, maxDays = 366) {
    const days = Math.round((untilExclusive.getTime() - from.getTime()) / DAY);
    if (days < 1 || days > maxDays) {
        throw new ResortApiError(422, "INVALID_DATE_RANGE", `Date range must be between 1 and ${maxDays} days.`);
    }
    return Array.from({ length: days }, (_, i) => (0, exports.dayKey)((0, exports.addDays)(from, i)));
}
function parseDateTime(v, name) {
    // Require an explicit UTC offset to avoid server-local timezone ambiguity.
    if (typeof v !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(v)) {
        throw new ResortApiError(422, "INVALID_DATETIME", `${name} needs an ISO timestamp with Z or UTC offset.`);
    }
    const d = new Date(v);
    if (!Number.isFinite(d.getTime())) {
        throw new ResortApiError(422, "INVALID_DATETIME", `${name} is invalid.`);
    }
    return d;
}
function validTimeZone(v) {
    const value = requiredText(v, "timeZone", 100);
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    }
    catch {
        throw new ResortApiError(422, "INVALID_TIMEZONE", "Enter a valid IANA time zone such as Asia/Kolkata.");
    }
    return value;
}
function localDate(dateTime, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(dateTime);
    const pick = (type) => parts.find(p => p.type === type)?.value || "";
    return parseDate(`${pick("year")}-${pick("month")}-${pick("day")}`, "local date");
}
function eventNights(startAt, endAt, timeZone) {
    const start = localDate(startAt, timeZone);
    const last = localDate(endAt, timeZone);
    // A same-day programme with accommodation occupies at least that night.
    const endExclusive = last.getTime() > start.getTime() ? last : (0, exports.addDays)(start, 1);
    dateRange(start, endExclusive);
    return { start, endExclusive };
}
function bookingRef() {
    return `AN-${Date.now().toString(36).toUpperCase()}-${(0, crypto_1.randomBytes)(4).toString("hex").toUpperCase()}`;
}
exports.activeReservations = [
    client_1.ResortReservationStatus.EXPECTED,
    client_1.ResortReservationStatus.IN_HOUSE,
    client_1.ResortReservationStatus.DEPARTED,
];
async function roomTypeFor(tx, propertyId, roomTypeId) {
    const type = await tx.resortRoomType.findFirst({
        where: { id: roomTypeId, propertyId },
        select: { id: true, name: true, quantity: true, maxAdults: true, maxChildren: true },
    });
    if (!type)
        throw new ResortApiError(404, "ROOM_TYPE_NOT_FOUND", "Room type does not belong to this property.");
    return type;
}
async function roomUnitFor(tx, propertyId, roomTypeId, roomUnitId) {
    const unit = await tx.resortRoomUnit.findFirst({
        where: { id: roomUnitId, propertyId, roomTypeId },
        select: { id: true, number: true, roomTypeId: true },
    });
    if (!unit)
        throw new ResortApiError(404, "ROOM_UNIT_NOT_FOUND", "Room number does not belong to this room type.");
    return unit;
}
function overlap(start, end, from, until) {
    return start.getTime() < until.getTime() && end.getTime() > from.getTime();
}
async function busyIntervals(tx, roomTypeId, from, until, ignoreReservationId) {
    const [reservations, blocks, holds] = await Promise.all([
        tx.resortReservation.findMany({
            where: {
                roomTypeId,
                status: { in: exports.activeReservations },
                checkInDate: { lt: until }, checkOutDate: { gt: from },
                ...(ignoreReservationId ? { id: { not: ignoreReservationId } } : {}),
            },
            select: { id: true, roomUnitId: true, checkInDate: true, checkOutDate: true },
        }),
        tx.resortRoomBlock.findMany({
            where: { roomUnit: { roomTypeId }, startDate: { lt: until }, endDateExclusive: { gt: from } },
            select: { roomUnitId: true, startDate: true, endDateExclusive: true },
        }),
        tx.resortEventRoomHold.findMany({
            where: { roomUnit: { roomTypeId }, startDate: { lt: until }, endDateExclusive: { gt: from } },
            select: { roomUnitId: true, startDate: true, endDateExclusive: true },
        }),
    ]);
    return { reservations, blocks, holds };
}
async function ensureAvailable(tx, args) {
    const type = await roomTypeFor(tx, args.propertyId, args.roomTypeId);
    const days = dateRange(args.from, args.until);
    const busy = await busyIntervals(tx, type.id, args.from, args.until, args.ignoreReservationId);
    // Only physically numbered rooms can be promised to guests or retreats.
    // This prevents bookings from consuming inventory that cannot be assigned at check-in.
    const registeredUnits = await tx.resortRoomUnit.count({ where: { propertyId: args.propertyId, roomTypeId: type.id } });
    const effectiveCapacity = Math.min(type.quantity, registeredUnits);
    const add = args.addCount ?? 1;
    for (const day of days) {
        const d = parseDate(day);
        const next = (0, exports.addDays)(d, 1);
        const count = busy.reservations.filter(r => overlap(r.checkInDate, r.checkOutDate, d, next)).length +
            busy.blocks.filter(b => overlap(b.startDate, b.endDateExclusive, d, next)).length +
            busy.holds.filter(h => overlap(h.startDate, h.endDateExclusive, d, next)).length;
        if (count + add > effectiveCapacity) {
            throw new ResortApiError(409, "ROOM_TYPE_FULL", `No numbered ${type.name} rooms are available on ${day}. Assign any missing room numbers first.`);
        }
    }
    if (args.roomUnitId) {
        await roomUnitFor(tx, args.propertyId, type.id, args.roomUnitId);
        const used = busy.reservations.some(r => r.roomUnitId === args.roomUnitId) ||
            busy.blocks.some(b => b.roomUnitId === args.roomUnitId) ||
            busy.holds.some(h => h.roomUnitId === args.roomUnitId);
        if (used)
            throw new ResortApiError(409, "ROOM_UNAVAILABLE", "This specific room is booked, blocked or reserved for an event.");
    }
}
async function ensureUnitFree(tx, propertyId, roomTypeId, roomUnitId, from, until, ignoreReservationId) {
    await roomUnitFor(tx, propertyId, roomTypeId, roomUnitId);
    const busy = await busyIntervals(tx, roomTypeId, from, until, ignoreReservationId);
    if (busy.reservations.some(r => r.roomUnitId === roomUnitId) ||
        busy.blocks.some(b => b.roomUnitId === roomUnitId) ||
        busy.holds.some(h => h.roomUnitId === roomUnitId))
        throw new ResortApiError(409, "ROOM_UNAVAILABLE", "This room is already booked, blocked or reserved for a retreat.");
}
function isPublished(status) {
    return status === client_1.ResortPropertyStatus.PUBLISHED;
}
