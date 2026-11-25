import {
  guarded, ownedProperty, prisma, transaction, parseDate, addDays,
  dayKey, dateRange, wholeNumber, optionalText,
  ensureUnitFree, ensureAvailable, roomUnitFor, ResortApiError,
  activeReservations, overlap,
} from "../services/resortManagement.service";

// GET /api/resort-owner/properties/:propertyId/calendar?start=2026-12-01&days=14&roomTypeId=...
export const getRoomCalendar = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const today = new Date().toISOString().slice(0, 10);
  const from = parseDate(req.query.start === undefined ? today : req.query.start, "start");
  const days = req.query.days === undefined ? 14 : wholeNumber(req.query.days, "days", 1, 31);
  const until = addDays(from, days);
  const dates = dateRange(from, until, 31);
  const roomTypeId = typeof req.query.roomTypeId === "string" ? req.query.roomTypeId : undefined;

  const [types, reservations, blocks, holds] = await Promise.all([
    prisma.resortRoomType.findMany({
      where: { propertyId: property.id, ...(roomTypeId ? { id: roomTypeId } : {}) },
      include: { units: { orderBy: { number: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.resortReservation.findMany({
      where: { propertyId: property.id, status: { in: activeReservations }, checkInDate: { lt: until }, checkOutDate: { gt: from },
        ...(roomTypeId ? { roomTypeId } : {}) },
      select: { id: true, roomUnitId: true, roomTypeId: true, guestName: true, status: true, checkInDate: true, checkOutDate: true },
    }),
    prisma.resortRoomBlock.findMany({
      where: { propertyId: property.id, startDate: { lt: until }, endDateExclusive: { gt: from },
        ...(roomTypeId ? { roomUnit: { roomTypeId } } : {}) },
      select: { id: true, roomUnitId: true, reason: true, startDate: true, endDateExclusive: true },
    }),
    prisma.resortEventRoomHold.findMany({
      where: { propertyId: property.id, startDate: { lt: until }, endDateExclusive: { gt: from },
        ...(roomTypeId ? { roomUnit: { roomTypeId } } : {}) },
      select: { id: true, roomUnitId: true, startDate: true, endDateExclusive: true, event: { select: { id: true, name: true } } },
    }),
  ]);

  const roomTypes = types.map(type => {
    const units = type.units.map(unit => {
      const cells = dates.map(date => {
        const start = parseDate(date);
        const end = addDays(start, 1);
        const reservation = reservations.find(r => r.roomUnitId === unit.id && overlap(r.checkInDate, r.checkOutDate, start, end));
        if (reservation) return { date, state: "BOOKED", label: reservation.guestName, reservationId: reservation.id, bookingStatus: reservation.status };
        const block = blocks.find(b => b.roomUnitId === unit.id && overlap(b.startDate, b.endDateExclusive, start, end));
        if (block) return { date, state: "BLOCKED", label: block.reason || "Blocked", blockId: block.id };
        const hold = holds.find(h => h.roomUnitId === unit.id && overlap(h.startDate, h.endDateExclusive, start, end));
        if (hold) return { date, state: "BLOCKED", label: `Retreat: ${hold.event.name || "Reserved"}`, eventId: hold.event.id, holdId: hold.id };
        return { date, state: "AVAILABLE", label: "Available" };
      });
      return { id: unit.id, number: unit.number, days: cells };
    });
    const unassignedReservations = reservations
      .filter(r => r.roomTypeId === type.id && r.roomUnitId === null)
      .map(r => ({ id: r.id, guestName: r.guestName, checkInDate: dayKey(r.checkInDate), checkOutDate: dayKey(r.checkOutDate) }));
    const occupiedCounts = dates.map(date => {
      const start = parseDate(date);
      const end = addDays(start, 1);
      return {
        date,
        booked: reservations.filter(r => r.roomTypeId === type.id && overlap(r.checkInDate, r.checkOutDate, start, end)).length,
        blocked: blocks.filter(b => units.some(u => u.id === b.roomUnitId) && overlap(b.startDate, b.endDateExclusive, start, end)).length,
        eventReserved: holds.filter(h => units.some(u => u.id === h.roomUnitId) && overlap(h.startDate, h.endDateExclusive, start, end)).length,
      };
    });
    return { id: type.id, name: type.name, quantity: type.quantity,
      unnumberedCount: Math.max(0, type.quantity - units.length), units, unassignedReservations, occupiedCounts };
  });
  res.json({ propertyId: property.id, startDate: dayKey(from), days, dates, roomTypes, legend: ["AVAILABLE", "BOOKED", "BLOCKED"] });
});

// POST /api/resort-owner/properties/:propertyId/calendar/blocks
// Body: {roomUnitIds:["uuid"],startDate:"2026-12-07",endDate:"2026-12-08",reason:"Maintenance"}
// endDate is INCLUSIVE on this endpoint; database stores end-exclusive.
export const blockRoomDates = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const from = parseDate(req.body?.startDate, "startDate");
  const last = parseDate(req.body?.endDate, "endDate");
  const until = addDays(last, 1);
  dateRange(from, until);
  const rawIds: unknown = req.body?.roomUnitIds ?? (req.body?.roomUnitId ? [req.body.roomUnitId] : []);
  if (!Array.isArray(rawIds) || rawIds.length < 1 || rawIds.length > 100 || rawIds.some(i => typeof i !== "string" || !i)) {
    throw new ResortApiError(422, "INVALID_ROOMS", "Choose between 1 and 100 valid room unit IDs.");
  }
  const ids: string[] = [...new Set(rawIds as string[])];
  const reason = optionalText(req.body?.reason, "reason", 300);
  const created = await transaction(async tx => {
    const units = await tx.resortRoomUnit.findMany({ where: { propertyId: property.id, id: { in: ids } } });
    if (units.length !== ids.length) throw new ResortApiError(404, "ROOM_UNIT_NOT_FOUND", "One or more selected rooms do not belong to your property.");
    for (const unit of units) {
      await roomUnitFor(tx, property.id, unit.roomTypeId, unit.id);
      await ensureUnitFree(tx, property.id, unit.roomTypeId, unit.id, from, until);
      await ensureAvailable(tx, { propertyId: property.id, roomTypeId: unit.roomTypeId,
        roomUnitId: unit.id, from, until });
      // Create immediately, so subsequent units see this block in the same transaction.
      await tx.resortRoomBlock.create({ data: { propertyId: property.id, roomUnitId: unit.id,
        startDate: from, endDateExclusive: until, reason } });
    }
    return tx.resortRoomBlock.findMany({
      where: { propertyId: property.id, roomUnitId: { in: ids }, startDate: from, endDateExclusive: until },
      include: { roomUnit: { select: { number: true, roomTypeId: true } } },
    });
  });
  res.status(201).json({ blocks: created });
});

// DELETE /api/resort-owner/properties/:propertyId/calendar/blocks/:blockId
export const unblockRoomDates = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const block = await prisma.resortRoomBlock.findFirst({ where: { id: String(req.params.blockId), propertyId: property.id } });
  if (!block) throw new ResortApiError(404, "BLOCK_NOT_FOUND", "Blocked date range not found.");
  await prisma.resortRoomBlock.delete({ where: { id: block.id } });
  res.json({ message: "Room dates unblocked." });
});
