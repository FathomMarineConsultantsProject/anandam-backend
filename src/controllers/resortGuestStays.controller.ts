import { Prisma, ResortReservationStatus } from "@prisma/client";
import {
  guarded, ownedProperty, prisma, transaction, bookingRef, parseDate,
  dateRange, dayKey, requiredText, optionalText, wholeNumber,
  roomTypeFor, roomUnitFor, ensureAvailable, ensureUnitFree, ResortApiError,
} from "../services/resortManagement.service";

const include = {
  roomType: { select: { id: true, name: true, maxAdults: true, maxChildren: true } },
  roomUnit: { select: { id: true, number: true } },
};
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bookingInput(body: any) {
  const guestName = requiredText(body?.guestName, "guestName", 200);
  const guestEmail = optionalText(body?.guestEmail, "guestEmail", 254);
  const guestPhone = optionalText(body?.guestPhone, "guestPhone", 50);
  const specialRequests = optionalText(body?.specialRequests, "specialRequests", 5000);
  if (guestEmail && !emailRegex.test(guestEmail)) throw new ResortApiError(422, "INVALID_EMAIL", "Enter a valid guest email address.");
  const roomTypeId = requiredText(body?.roomTypeId, "roomTypeId", 80);
  const roomUnitId = body?.roomUnitId ? requiredText(body.roomUnitId, "roomUnitId", 80) : null;
  const adults = wholeNumber(body?.adults, "adults", 1, 100);
  const children = wholeNumber(body?.children ?? 0, "children", 0, 100);
  const checkInDate = parseDate(body?.checkInDate, "checkInDate");
  const checkOutDate = parseDate(body?.checkOutDate, "checkOutDate");
  dateRange(checkInDate, checkOutDate);
  const expectedArrivalTime = optionalText(body?.expectedArrivalTime, "expectedArrivalTime", 5);
  if (expectedArrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(expectedArrivalTime)) {
    throw new ResortApiError(422, "INVALID_ARRIVAL_TIME", "expectedArrivalTime must be HH:MM (24-hour clock)." );
  }
  return { guestName, guestEmail, guestPhone, specialRequests, roomTypeId, roomUnitId,
    adults, children, checkInDate, checkOutDate, expectedArrivalTime };
}

async function validateRoomCapacity(tx: Prisma.TransactionClient, propertyId: string, data: ReturnType<typeof bookingInput>) {
  const type = await roomTypeFor(tx, propertyId, data.roomTypeId);
  if (data.adults > type.maxAdults || data.children > type.maxChildren) {
    throw new ResortApiError(422, "GUEST_CAPACITY_EXCEEDED", `${type.name} permits at most ${type.maxAdults} adults and ${type.maxChildren} children.`);
  }
  if (data.roomUnitId) await roomUnitFor(tx, propertyId, type.id, data.roomUnitId);
}

// POST /api/resort-owner/properties/:propertyId/guest-stays
// This is a staff-created reservation, not a payment or customer checkout API.
export const createGuestStay = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const data = bookingInput(req.body);
  const booking = await transaction(async tx => {
    await validateRoomCapacity(tx, property.id, data);
    await ensureAvailable(tx, { propertyId: property.id, roomTypeId: data.roomTypeId,
      roomUnitId: data.roomUnitId, from: data.checkInDate, until: data.checkOutDate });
    return tx.resortReservation.create({ data: { ...data, propertyId: property.id,
      bookingReference: bookingRef(), status: ResortReservationStatus.EXPECTED }, include });
  });
  res.status(201).json({ reservation: booking });
});

// GET /api/resort-owner/properties/:propertyId/guest-stays?date=2026-12-04&tab=arrivals&search=&page=1
export const listGuestStays = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const today = new Date().toISOString().slice(0, 10);
  const date = parseDate(req.query.date ?? today, "date");
  const tab = String(req.query.tab || "arrivals").trim().toLowerCase().replace(/-/g, "_");
  if (!["arrivals", "in_house", "departures"].includes(tab)) {
    throw new ResortApiError(422, "INVALID_TAB", "tab must be arrivals, in_house, or departures.");
  }
  const page = req.query.page === undefined ? 1 : wholeNumber(req.query.page, "page", 1, 100000);
  const limit = req.query.limit === undefined ? 20 : wholeNumber(req.query.limit, "limit", 1, 100);
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 150) : "";
  const arrival: Prisma.ResortReservationWhereInput = { status: ResortReservationStatus.EXPECTED, checkInDate: date };
  const inHouse: Prisma.ResortReservationWhereInput = {
    status: ResortReservationStatus.IN_HOUSE, checkInDate: { lte: date }, checkOutDate: { gte: date },
  };
  const departure: Prisma.ResortReservationWhereInput = {
    status: { in: [ResortReservationStatus.IN_HOUSE, ResortReservationStatus.DEPARTED] },
    checkOutDate: date,
  };
  const where: Prisma.ResortReservationWhereInput = {
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
    prisma.resortReservation.findMany({ where, orderBy: { checkInDate: "asc" },
      skip: (page - 1) * limit, take: limit, include }),
    prisma.resortReservation.count({ where }),
    prisma.resortReservation.count({ where: { propertyId: property.id, ...arrival } }),
    prisma.resortReservation.count({ where: { propertyId: property.id, ...inHouse } }),
    prisma.resortReservation.count({ where: { propertyId: property.id, ...departure } }),
  ]);
  res.json({ date: dayKey(date), tab, counts: { arrivals, inHouse: inHouseCount, departures },
    reservations: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// GET /api/resort-owner/properties/:propertyId/guest-stays/:reservationId
export const getGuestStay = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const reservation = await prisma.resortReservation.findFirst({
    where: { id: String(req.params.reservationId), propertyId: property.id }, include,
  });
  if (!reservation) throw new ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
  res.json({ reservation });
});

// PATCH /api/resort-owner/properties/:propertyId/guest-stays/:reservationId
// Expected bookings can be edited before check-in. Supplied fields are merged.
export const updateGuestStay = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const updated = await transaction(async tx => {
    const current = await tx.resortReservation.findFirst({
      where: { id: String(req.params.reservationId), propertyId: property.id },
    });
    if (!current) throw new ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
    if (current.status !== ResortReservationStatus.EXPECTED) {
      throw new ResortApiError(409, "STAY_ALREADY_STARTED", "Only expected reservations can be edited here.");
    }
    const merged = {
      ...current,
      checkInDate: dayKey(current.checkInDate), checkOutDate: dayKey(current.checkOutDate),
      ...req.body,
    };
    const data = bookingInput(merged);
    await validateRoomCapacity(tx, property.id, data);
    await ensureAvailable(tx, { propertyId: property.id, roomTypeId: data.roomTypeId,
      roomUnitId: data.roomUnitId, from: data.checkInDate, until: data.checkOutDate,
      ignoreReservationId: current.id });
    return tx.resortReservation.update({ where: { id: current.id }, data, include });
  });
  res.json({ reservation: updated });
});

// POST /api/resort-owner/properties/:propertyId/guest-stays/:reservationId/check-in
// Optional body: { "roomUnitId":"..." }. If omitted, select first free numbered room.
export const checkInGuest = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const reservation = await transaction(async tx => {
    const current = await tx.resortReservation.findFirst({
      where: { id: String(req.params.reservationId), propertyId: property.id },
    });
    if (!current) throw new ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
    if (current.status !== ResortReservationStatus.EXPECTED) {
      throw new ResortApiError(409, "INVALID_STAY_STATUS", "Only an expected guest can be checked in.");
    }
    let selectedId = req.body?.roomUnitId ? String(req.body.roomUnitId) : current.roomUnitId;
    if (!selectedId) {
      const options = await tx.resortRoomUnit.findMany({ where: { propertyId: property.id,
        roomTypeId: current.roomTypeId }, orderBy: { number: "asc" } });
      for (const unit of options) {
        try {
          await ensureUnitFree(tx, property.id, current.roomTypeId, unit.id,
            current.checkInDate, current.checkOutDate, current.id);
          selectedId = unit.id;
          break;
        } catch (error) {
          if (error instanceof ResortApiError && error.code === "ROOM_UNAVAILABLE") continue;
          throw error;
        }
      }
    }
    if (!selectedId) {
      throw new ResortApiError(409, "ROOM_ASSIGNMENT_REQUIRED", "Assign room numbers and choose an available room before check-in.");
    }
    await ensureUnitFree(tx, property.id, current.roomTypeId, selectedId,
      current.checkInDate, current.checkOutDate, current.id);
    await ensureAvailable(tx, { propertyId: property.id, roomTypeId: current.roomTypeId,
      roomUnitId: selectedId, from: current.checkInDate, until: current.checkOutDate,
      ignoreReservationId: current.id });
    return tx.resortReservation.update({ where: { id: current.id }, data: {
      roomUnitId: selectedId, status: ResortReservationStatus.IN_HOUSE, checkedInAt: new Date(),
    }, include });
  });
  res.json({ message: "Guest checked in.", reservation });
});

// POST /api/resort-owner/properties/:propertyId/guest-stays/:reservationId/check-out
export const checkOutGuest = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const reservation = await transaction(async tx => {
    const current = await tx.resortReservation.findFirst({
      where: { id: String(req.params.reservationId), propertyId: property.id },
    });
    if (!current) throw new ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
    if (current.status !== ResortReservationStatus.IN_HOUSE) {
      throw new ResortApiError(409, "INVALID_STAY_STATUS", "Only an in-house guest can be checked out.");
    }
    return tx.resortReservation.update({ where: { id: current.id }, data: {
      status: ResortReservationStatus.DEPARTED, checkedOutAt: new Date(),
    }, include });
  });
  res.json({ message: "Guest checked out.", reservation });
});

// POST /api/resort-owner/properties/:propertyId/guest-stays/:reservationId/cancel
export const cancelGuestStay = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const reservation = await transaction(async tx => {
    const current = await tx.resortReservation.findFirst({
      where: { id: String(req.params.reservationId), propertyId: property.id },
    });
    if (!current) throw new ResortApiError(404, "RESERVATION_NOT_FOUND", "Booking not found.");
    if (current.status !== ResortReservationStatus.EXPECTED) {
      throw new ResortApiError(409, "INVALID_STAY_STATUS", "Only expected reservations can be cancelled.");
    }
    return tx.resortReservation.update({ where: { id: current.id },
      data: { status: ResortReservationStatus.CANCELLED }, include });
  });
  res.json({ message: "Reservation cancelled.", reservation });
});
