"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceRoomUnits = exports.listRoomUnits = void 0;
const resortManagement_service_1 = require("../services/resortManagement.service");
// GET /api/resort-owner/properties/:propertyId/rooms/:roomId/units
exports.listRoomUnits = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const type = await resortManagement_service_1.prisma.resortRoomType.findFirst({
        where: { id: String(req.params.roomId), propertyId: property.id },
        select: { id: true, name: true, quantity: true, units: { orderBy: { number: "asc" } } },
    });
    if (!type)
        throw new resortManagement_service_1.ResortApiError(404, "ROOM_TYPE_NOT_FOUND", "Room type not found.");
    res.json({ roomTypeId: type.id, quantity: type.quantity, units: type.units, unnumberedCount: Math.max(0, type.quantity - type.units.length) });
});
// PUT /api/resort-owner/properties/:propertyId/rooms/:roomId/units
// Body: { "roomNumbers": ["401", "402"] }
// Safe to call repeatedly. Existing units retain their IDs; used rooms cannot be removed.
exports.replaceRoomUnits = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    if (!Array.isArray(req.body?.roomNumbers)) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_ROOM_NUMBERS", "roomNumbers must be an array.");
    }
    const numbers = req.body.roomNumbers.map((v) => {
        if (typeof v !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9 -]{0,39}$/.test(v.trim())) {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_ROOM_NUMBERS", "Each room number must be 1-40 letters, digits, spaces or hyphens.");
        }
        return v.trim().toUpperCase();
    });
    if (new Set(numbers).size !== numbers.length) {
        throw new resortManagement_service_1.ResortApiError(422, "DUPLICATE_ROOM_NUMBERS", "Every room number must be unique.");
    }
    const result = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const type = await (0, resortManagement_service_1.roomTypeFor)(tx, property.id, String(req.params.roomId));
        if (numbers.length > type.quantity) {
            throw new resortManagement_service_1.ResortApiError(422, "TOO_MANY_ROOM_UNITS", `This room type contains ${type.quantity} rooms. You cannot assign more numbers.`);
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
                throw new resortManagement_service_1.ResortApiError(409, "ROOM_UNIT_IN_USE", "A room number with reservations, calendar blocks or retreat holds cannot be removed or renamed.");
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
