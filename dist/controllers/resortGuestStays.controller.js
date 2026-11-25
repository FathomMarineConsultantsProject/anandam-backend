"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelGuestStay = exports.checkOutGuest = exports.checkInGuest = exports.updateGuestStay = exports.getGuestStay = exports.listGuestStays = exports.createGuestStay = void 0;
const client_1 = require("@prisma/client");
const resortManagement_service_1 = require("../services/resortManagement.service");
const include = {
    roomType: { select: { id: true, name: true, maxAdults: true, maxChildren: true } },
    roomUnit: { select: { id: true, number: true } },
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function bookingInput(body) {
    const guestName = (0, resortManagement_service_1.requiredText)(body?.guestName, "guestName", 200);
    const guestEmail = (0, resortManagement_service_1.optionalText)(body?.guestEmail, "guestEmail", 254);
    const guestPhone = (0, resortManagement_service_1.optionalText)(body?.guestPhone, "guestPhone", 50);
    const specialRequests = (0, resortManagement_service_1.optionalText)(body?.specialRequests, "specialRequests", 5000);
    if (guestEmail && !emailRegex.test(guestEmail))
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_EMAIL", "Enter a valid guest email address.");
    const roomTypeId = (0, resortManagement_service_1.requiredText)(body?.roomTypeId, "roomTypeId", 80);
    const roomUnitId = body?.roomUnitId ? (0, resortManagement_service_1.requiredText)(body.roomUnitId, "roomUnitId", 80) : null;
    const adults = (0, resortManagement_service_1.wholeNumber)(body?.adults, "adults", 1, 100);
    const children = (0, resortManagement_service_1.wholeNumber)(body?.children ?? 0, "children", 0, 100);
    const checkInDate = (0, resortManagement_service_1.parseDate)(body?.checkInDate, "checkInDate");
    const checkOutDate = (0, resortManagement_service_1.parseDate)(body?.checkOutDate, "checkOutDate");
    (0, resortManagement_service_1.dateRange)(checkInDate, checkOutDate);
    const expectedArrivalTime = (0, resortManagement_service_1.optionalText)(body?.expectedArrivalTime, "expectedArrivalTime", 5);
    if (expectedArrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(expectedArrivalTime)) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_ARRIVAL_TIME", "expectedArrivalTime must be HH:MM (24-hour clock).");
    }
    return { guestName, guestEmail, guestPhone, specialRequests, roomTypeId, roomUnitId,
        adults, children, checkInDate, checkOutDate, expectedArrivalTime };
}
async function validateRoomCapacity(tx, propertyId, data) {
    const type = await (0, resortManagement_service_1.roomTypeFor)(tx, propertyId, data.roomTypeId);
    if (data.adults > type.maxAdults || data.children > type.maxChildren) {
        throw new resortManagement_service_1.ResortApiError(422, "GUEST_CAPACITY_EXCEEDED", `${type.name} permits at most ${type.maxAdults} adults and ${type.maxChildren} children.`);
    }
    if (data.roomUnitId)
        await (0, resortManagement_service_1.roomUnitFor)(tx, propertyId, type.id, data.roomUnitId);
}
// POST /api/resort-owner/properties/:propertyId/guest-stays
// This is a staff-created reservation, not a payment or customer checkout API.
exports.createGuestStay = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const data = bookingInput(req.body);
    const booking = await (0, resortManagement_service_1.transaction)(async (tx) => {
        await validateRoomCapacity(tx, property.id, data);
        await (0, resortManagement_service_1.ensureAvailable)(tx, { propertyId: property.id, roomTypeId: data.roomTypeId,
            roomUnitId: data.roomUnitId, from: data.checkInDate, until: data.checkOutDate });
        return tx.resortReservation.create({ data: { ...data, propertyId: property.id,
                bookingReference: (0, resortManagement_service_1.bookingRef)(), status: client_1.ResortReservationStatus.EXPECTED }, include });
    });
    res.status(201).json({ reservation: booking });
});
// GET /api/resort-owner/properties/:propertyId/guest-stays?date=2026-12-04&tab=arrivals&search=&page=1
exports.listGuestStays = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const today = new Date().toISOString().slice(0, 10);
    const date = (0, resortManagement_service_1.parseDate)(req.query.date ?? today, "date");
    const tab = String(req.query.tab || "arrivals").trim().toLowerCase().replace(/-/g, "_");
    if (!["arrivals", "in_house", "departures"].includes(tab)) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_TAB", "tab must be arrivals, in_house, or departures.");
    }
    const page = req.query.page === undefined ? 1 : (0, resortManagement_service_1.wholeNumber)(req.query.page, "page", 1, 100000);
    const limit = req.query.limit === undefined ? 20 : (0, resortManagement_service_1.wholeNumber)(req.query.limit, "limit", 1, 100);
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 150) : "";
    const arrival = { status: client_1.ResortReservationStatus.EXPECTED, checkInDate: date };
    const inHouse = {
        status: client_1.ResortReservationStatus.IN_HOUSE, checkInDate: { lte: date }, checkOutDate: { gte: date },
    };
    const departure = {
        status: { in: [client_1.ResortReservationStatus.IN_HOUSE, client_1.ResortReservationStatus.DEPARTED] },
        checkOutDate: date,
    };
    const where = {
        propertyId: property.id,
        ...(tab === "arrivals" ? arrival : tab === "in_house" ? inHouse : departure),
        ...(search ? { OR: [
                { guestName: { contains: search, mode: "insensitive" } },
                { guestEmail: { contains: search, mode: "insensitive" } },
                { bookingReference: { contains: search, mode: "insensitive" } },
                { roomUnit: { number: { contains: search, mode: "insensitive" } } },
            ] } : {}),
    };
    const [rows, total, arrivals, inHouseCount, departures] = await Promise.all([
        resortManagement_service_1.prisma.resortReservation.findMany({ where, orderBy: { checkInDate: "asc" },
            skip: (page - 1) * limit, take: limit, include }),
        resortManagement_service_1.prisma.resortReservation.count({ where }),
        resortManagement_service_1.prisma.resortReservation.count({ where: { propertyId: property.id, ...arrival } }),
        resortManagement_service_1.prisma.resortReservation.count({ where: { propertyId: property.id, ...inHouse } }),
        resortManagement_service_1.prisma.resortReservation.count({ where: { propertyId: property.id, ...departure } }),
    ]);
    res.json({ date: (0, resortManagement_service_1.dayKey)(date), tab, counts: { arrivals, inHouse: inHouseCount, departures },
        reservations: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});
// GET /api/resort-owner/properties/:propertyId/guest-stays/:reservationId
exports.getGuestStay = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const reservation = await resortManagement_service_1.prisma.resortReservation.findFirst({
        where: { id: String(req.params.reservationId), propertyId: property.id }, include,
    });
    if (!reservation)
        throw new resortManagement_service_1.ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
    res.json({ reservation });
});
// PATCH /api/resort-owner/properties/:propertyId/guest-stays/:reservationId
// Expected bookings can be edited before check-in. Supplied fields are merged.
exports.updateGuestStay = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const updated = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const current = await tx.resortReservation.findFirst({
            where: { id: String(req.params.reservationId), propertyId: property.id },
        });
        if (!current)
            throw new resortManagement_service_1.ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
        if (current.status !== client_1.ResortReservationStatus.EXPECTED) {
            throw new resortManagement_service_1.ResortApiError(409, "STAY_ALREADY_STARTED", "Only expected reservations can be edited here.");
        }
        const merged = {
            ...current,
            checkInDate: (0, resortManagement_service_1.dayKey)(current.checkInDate), checkOutDate: (0, resortManagement_service_1.dayKey)(current.checkOutDate),
            ...req.body,
        };
        const data = bookingInput(merged);
        await validateRoomCapacity(tx, property.id, data);
        await (0, resortManagement_service_1.ensureAvailable)(tx, { propertyId: property.id, roomTypeId: data.roomTypeId,
            roomUnitId: data.roomUnitId, from: data.checkInDate, until: data.checkOutDate,
            ignoreReservationId: current.id });
        return tx.resortReservation.update({ where: { id: current.id }, data, include });
    });
    res.json({ reservation: updated });
});
// POST /api/resort-owner/properties/:propertyId/guest-stays/:reservationId/check-in
// Optional body: { "roomUnitId":"..." }. If omitted, select first free numbered room.
exports.checkInGuest = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const reservation = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const current = await tx.resortReservation.findFirst({
            where: { id: String(req.params.reservationId), propertyId: property.id },
        });
        if (!current)
            throw new resortManagement_service_1.ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
        if (current.status !== client_1.ResortReservationStatus.EXPECTED) {
            throw new resortManagement_service_1.ResortApiError(409, "INVALID_STAY_STATUS", "Only an expected guest can be checked in.");
        }
        let selectedId = req.body?.roomUnitId ? String(req.body.roomUnitId) : current.roomUnitId;
        if (!selectedId) {
            const options = await tx.resortRoomUnit.findMany({ where: { propertyId: property.id,
                    roomTypeId: current.roomTypeId }, orderBy: { number: "asc" } });
            for (const unit of options) {
                try {
                    await (0, resortManagement_service_1.ensureUnitFree)(tx, property.id, current.roomTypeId, unit.id, current.checkInDate, current.checkOutDate, current.id);
                    selectedId = unit.id;
                    break;
                }
                catch (error) {
                    if (error instanceof resortManagement_service_1.ResortApiError && error.code === "ROOM_UNAVAILABLE")
                        continue;
                    throw error;
                }
            }
        }
        if (!selectedId) {
            throw new resortManagement_service_1.ResortApiError(409, "ROOM_ASSIGNMENT_REQUIRED", "Assign room numbers and choose an available room before check-in.");
        }
        await (0, resortManagement_service_1.ensureUnitFree)(tx, property.id, current.roomTypeId, selectedId, current.checkInDate, current.checkOutDate, current.id);
        await (0, resortManagement_service_1.ensureAvailable)(tx, { propertyId: property.id, roomTypeId: current.roomTypeId,
            roomUnitId: selectedId, from: current.checkInDate, until: current.checkOutDate,
            ignoreReservationId: current.id });
        return tx.resortReservation.update({ where: { id: current.id }, data: {
                roomUnitId: selectedId, status: client_1.ResortReservationStatus.IN_HOUSE, checkedInAt: new Date(),
            }, include });
    });
    res.json({ message: "Guest checked in.", reservation });
});
// POST /api/resort-owner/properties/:propertyId/guest-stays/:reservationId/check-out
exports.checkOutGuest = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const reservation = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const current = await tx.resortReservation.findFirst({
            where: { id: String(req.params.reservationId), propertyId: property.id },
        });
        if (!current)
            throw new resortManagement_service_1.ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
        if (current.status !== client_1.ResortReservationStatus.IN_HOUSE) {
            throw new resortManagement_service_1.ResortApiError(409, "INVALID_STAY_STATUS", "Only an in-house guest can be checked out.");
        }
        return tx.resortReservation.update({ where: { id: current.id }, data: {
                status: client_1.ResortReservationStatus.DEPARTED, checkedOutAt: new Date(),
            }, include });
    });
    res.json({ message: "Guest checked out.", reservation });
});
// POST /api/resort-owner/properties/:propertyId/guest-stays/:reservationId/cancel
exports.cancelGuestStay = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const reservation = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const current = await tx.resortReservation.findFirst({
            where: { id: String(req.params.reservationId), propertyId: property.id },
        });
        if (!current)
            throw new resortManagement_service_1.ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
        if (current.status !== client_1.ResortReservationStatus.EXPECTED) {
            throw new resortManagement_service_1.ResortApiError(409, "INVALID_STAY_STATUS", "Only expected reservations can be cancelled.");
        }
        return tx.resortReservation.update({ where: { id: current.id },
            data: { status: client_1.ResortReservationStatus.CANCELLED }, include });
    });
    res.json({ message: "Reservation cancelled.", reservation });
});
