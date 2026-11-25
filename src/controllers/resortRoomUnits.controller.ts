import { guarded, ownedProperty, prisma, roomTypeFor, transaction, ResortApiError } from "../services/resortManagement.service";

// GET /api/resort-owner/properties/:propertyId/rooms/:roomId/units
export const listRoomUnits = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const type = await prisma.resortRoomType.findFirst({
    where: { id: String(req.params.roomId), propertyId: property.id },
    select: { id: true, name: true, quantity: true, units: { orderBy: { number: "asc" } } },
  });
  if (!type) throw new ResortApiError(404, "ROOM_TYPE_NOT_FOUND", "Room type not found.");
  res.json({ roomTypeId: type.id, quantity: type.quantity, units: type.units, unnumberedCount: Math.max(0, type.quantity - type.units.length) });
});

// PUT /api/resort-owner/properties/:propertyId/rooms/:roomId/units
// Body: { "roomNumbers": ["401", "402"] }
// Safe to call repeatedly. Existing units retain their IDs; used rooms cannot be removed.
export const replaceRoomUnits = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  if (!Array.isArray(req.body?.roomNumbers)) {
    throw new ResortApiError(422, "INVALID_ROOM_NUMBERS", "roomNumbers must be an array.");
  }
  const numbers: string[] = req.body.roomNumbers.map((v: unknown) => {
    if (typeof v !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9 -]{0,39}$/.test(v.trim())) {
      throw new ResortApiError(422, "INVALID_ROOM_NUMBERS", "Each room number must be 1-40 letters, digits, spaces or hyphens.");
    }
    return v.trim().toUpperCase();
  });
  if (new Set(numbers).size !== numbers.length) {
    throw new ResortApiError(422, "DUPLICATE_ROOM_NUMBERS", "Every room number must be unique.");
  }
  const result = await transaction(async tx => {
    const type = await roomTypeFor(tx, property.id, String(req.params.roomId));
    if (numbers.length > type.quantity) {
      throw new ResortApiError(422, "TOO_MANY_ROOM_UNITS", `This room type contains ${type.quantity} rooms. You cannot assign more numbers.`);
    }
    const current = await tx.resortRoomUnit.findMany({ where: { roomTypeId: type.id } });
    const remove = current.filter(u => !numbers.includes(u.number));
    if (remove.length) {
      const ids = remove.map(u => u.id);
      const [reservationCount, blockCount, holdCount] = await Promise.all([
        tx.resortReservation.count({ where: { roomUnitId: { in: ids } } }),
        tx.resortRoomBlock.count({ where: { roomUnitId: { in: ids } } }),
        tx.resortEventRoomHold.count({ where: { roomUnitId: { in: ids } } }),
      ]);
      if (reservationCount || blockCount || holdCount) {
        throw new ResortApiError(409, "ROOM_UNIT_IN_USE", "A room number with reservations, calendar blocks or retreat holds cannot be removed or renamed.");
      }
      await tx.resortRoomUnit.deleteMany({ where: { id: { in: ids } } });
    }
    const currentNumbers = new Set(current.map(u => u.number));
    for (const number of numbers) {
      if (!currentNumbers.has(number)) {
        await tx.resortRoomUnit.create({ data: { propertyId: property.id, roomTypeId: type.id, number } });
      }
    }
    const units = await tx.resortRoomUnit.findMany({ where: { roomTypeId: type.id }, orderBy: { number: "asc" } });
    return { roomTypeId: type.id, quantity: type.quantity, units, unnumberedCount: type.quantity - units.length };
  });
  res.json(result);
});
