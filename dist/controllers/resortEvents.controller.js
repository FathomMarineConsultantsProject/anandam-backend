"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.unpublishEvent = exports.publishEvent = exports.updateEvent = exports.getEvent = exports.listEvents = exports.createEvent = void 0;
const client_1 = require("@prisma/client");
const blob_1 = require("@vercel/blob");
const resortManagement_service_1 = require("../services/resortManagement.service");
const details = {
    occurrences: { orderBy: { startAt: "asc" } },
    allocations: { include: { roomType: { select: { id: true, name: true, quantity: true } } } },
    images: { orderBy: { sortOrder: "asc" } },
};
function scalarChanges(body) {
    const data = {};
    if (Object.prototype.hasOwnProperty.call(body, "draftStep")) {
        data.draftStep = (0, resortManagement_service_1.wholeNumber)(body.draftStep, "draftStep", 1, 6);
    }
    if (Object.prototype.hasOwnProperty.call(body, "listingType")) {
        const v = body.listingType;
        if (v !== null && !Object.values(client_1.ResortEventType).includes(v)) {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_EVENT_TYPE", "Unknown listing type.");
        }
        data.listingType = v;
    }
    const texts = [
        "name", "shortDescription", "venue", "ageRequirements", "experienceLevel",
        "whatsIncluded", "whatToBring", "whatsNotIncluded", "cancellationPolicy",
    ];
    for (const key of texts) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            const max = key === "shortDescription" || key === "whatsIncluded" || key === "whatToBring" || key === "whatsNotIncluded" || key === "cancellationPolicy" ? 10000 : 300;
            data[key] = (0, resortManagement_service_1.optionalText)(body[key], key, max);
        }
    }
    for (const key of ["maxParticipants", "minParticipants"]) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            data[key] = body[key] === null || body[key] === "" ? null : (0, resortManagement_service_1.wholeNumber)(body[key], key, key === "maxParticipants" ? 1 : 0, 100000);
        }
    }
    if (Object.prototype.hasOwnProperty.call(body, "pricingType")) {
        const v = body.pricingType;
        if (v !== null && !Object.values(client_1.ResortEventPricingType).includes(v)) {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_PRICING_TYPE", "Unknown pricing type.");
        }
        data.pricingType = v;
    }
    if (Object.prototype.hasOwnProperty.call(body, "currency")) {
        const v = (0, resortManagement_service_1.requiredText)(body.currency, "currency", 3).toUpperCase();
        if (!/^[A-Z]{3}$/.test(v))
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_CURRENCY", "Use a three-letter currency code.");
        data.currency = v;
    }
    if (Object.prototype.hasOwnProperty.call(body, "price")) {
        if (body.price === null || body.price === "")
            data.price = null;
        else {
            const raw = String(body.price);
            if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) {
                throw new resortManagement_service_1.ResortApiError(422, "INVALID_PRICE", "Enter a non-negative price with at most two decimal places.");
            }
            data.price = new client_1.Prisma.Decimal(raw);
        }
    }
    if (Object.prototype.hasOwnProperty.call(body, "accommodationIncluded")) {
        if (body.accommodationIncluded !== null && typeof body.accommodationIncluded !== "boolean") {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_ACCOMMODATION", "accommodationIncluded must be true, false or null.");
        }
        data.accommodationIncluded = body.accommodationIncluded;
    }
    return data;
}
function parsedOccurrences(value) {
    if (!Array.isArray(value) || value.length > 50) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_OCCURRENCES", "occurrences must be an array with no more than 50 schedules.");
    }
    return value.map((row, index) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_OCCURRENCE", `Occurrence ${index + 1} is invalid.`);
        }
        const startAt = (0, resortManagement_service_1.parseDateTime)(row.startAt, "startAt");
        const endAt = (0, resortManagement_service_1.parseDateTime)(row.endAt, "endAt");
        const timeZone = (0, resortManagement_service_1.validTimeZone)(row.timeZone);
        if (endAt.getTime() <= startAt.getTime() || endAt.getTime() - startAt.getTime() > 90 * 86400000) {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_OCCURRENCE", "An occurrence must last more than zero hours and no longer than 90 days.");
        }
        const schedule = (0, resortManagement_service_1.requiredText)(row.schedule, "schedule", 15000);
        return { startAt, endAt, timeZone, schedule };
    });
}
function parsedAllocations(value) {
    if (!Array.isArray(value) || value.length > 30) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_ALLOCATIONS", "roomAllocations must be an array with no more than 30 room types.");
    }
    const rows = value.map((row, i) => {
        const roomTypeId = (0, resortManagement_service_1.requiredText)(row?.roomTypeId, `roomAllocations[${i}].roomTypeId`, 80);
        const quantity = (0, resortManagement_service_1.wholeNumber)(row?.quantity, "reserved room quantity", 1, 10000);
        return { roomTypeId, quantity };
    });
    if (new Set(rows.map(r => r.roomTypeId)).size !== rows.length) {
        throw new resortManagement_service_1.ResortApiError(422, "DUPLICATE_ALLOCATIONS", "A room type can be selected only once per event.");
    }
    return rows;
}
async function replaceEventDetails(tx, propertyId, eventId, body) {
    const data = scalarChanges(body);
    if (data.maxParticipants !== undefined || data.minParticipants !== undefined) {
        const current = await tx.resortEvent.findUniqueOrThrow({ where: { id: eventId } });
        const max = data.maxParticipants !== undefined ? data.maxParticipants : current.maxParticipants;
        const min = data.minParticipants !== undefined ? data.minParticipants : current.minParticipants;
        if (max !== null && min !== null && min > max) {
            throw new resortManagement_service_1.ResortApiError(422, "INVALID_CAPACITY", "Minimum participants cannot exceed maximum participants.");
        }
    }
    await tx.resortEvent.update({ where: { id: eventId }, data });
    if (Object.prototype.hasOwnProperty.call(body, "occurrences")) {
        const occurrences = parsedOccurrences(body.occurrences);
        await tx.resortEventOccurrence.deleteMany({ where: { eventId } });
        if (occurrences.length) {
            await tx.resortEventOccurrence.createMany({ data: occurrences.map(row => ({ ...row, eventId })) });
        }
    }
    if (Object.prototype.hasOwnProperty.call(body, "roomAllocations")) {
        const allocations = parsedAllocations(body.roomAllocations);
        for (const row of allocations) {
            const type = await (0, resortManagement_service_1.roomTypeFor)(tx, propertyId, row.roomTypeId);
            if (row.quantity > type.quantity) {
                throw new resortManagement_service_1.ResortApiError(422, "INVALID_ALLOCATION", `Cannot reserve more than ${type.quantity} ${type.name} rooms.`);
            }
        }
        await tx.resortEventRoomAllocation.deleteMany({ where: { eventId } });
        if (allocations.length) {
            await tx.resortEventRoomAllocation.createMany({ data: allocations.map(row => ({ ...row, eventId })) });
        }
    }
    return tx.resortEvent.findUniqueOrThrow({ where: { id: eventId }, include: details });
}
// POST /api/resort-owner/properties/:propertyId/events
// Accepts any initial step-1 fields, or an empty body to start a draft.
exports.createEvent = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const body = req.body ?? {};
    if (typeof body !== "object" || Array.isArray(body)) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_BODY", "Provide a JSON object.");
    }
    const event = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const draft = await tx.resortEvent.create({ data: { propertyId: property.id } });
        return replaceEventDetails(tx, property.id, draft.id, body);
    });
    res.status(201).json({ event });
});
// GET /api/resort-owner/properties/:propertyId/events
exports.listEvents = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const property = await (0, resortManagement_service_1.ownedProperty)(req);
    const events = await resortManagement_service_1.prisma.resortEvent.findMany({
        where: { propertyId: property.id },
        orderBy: { updatedAt: "desc" },
        include: details,
    });
    res.json({ events });
});
// GET /api/resort-owner/properties/:propertyId/events/:eventId
exports.getEvent = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    const record = await resortManagement_service_1.prisma.resortEvent.findUniqueOrThrow({ where: { id: event.id }, include: details });
    res.json({ event: record });
});
// PATCH /api/resort-owner/properties/:propertyId/events/:eventId
// Save-draft accepts scalar fields plus full replacement arrays:
// occurrences: [{startAt,endAt,timeZone,schedule}]
// roomAllocations: [{roomTypeId,quantity}]
exports.updateEvent = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { property, event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    const body = req.body ?? {};
    if (typeof body !== "object" || Array.isArray(body)) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_BODY", "Provide a JSON object.");
    }
    const updated = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const current = await tx.resortEvent.findUniqueOrThrow({ where: { id: event.id } });
        if (current.status === client_1.ResortEventStatus.PUBLISHED) {
            throw new resortManagement_service_1.ResortApiError(409, "EVENT_IS_PUBLISHED", "Unpublish the event before editing its schedule or pricing.");
        }
        return replaceEventDetails(tx, property.id, event.id, body);
    });
    res.json({ event: updated });
});
// POST /api/resort-owner/properties/:propertyId/events/:eventId/publish
exports.publishEvent = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { property, event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    if (property.status !== "PUBLISHED" || !property.onboardingCompleted) {
        throw new resortManagement_service_1.ResortApiError(409, "PROPERTY_NOT_PUBLISHED", "Publish the parent property before publishing events.");
    }
    const published = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const current = await tx.resortEvent.findUniqueOrThrow({ where: { id: event.id }, include: details });
        if (current.status === client_1.ResortEventStatus.PUBLISHED)
            return current;
        const needed = [];
        if (!current.listingType)
            needed.push("listingType");
        if (!current.name?.trim())
            needed.push("name");
        if (!current.shortDescription?.trim())
            needed.push("shortDescription");
        if (!current.venue?.trim())
            needed.push("venue");
        if (!current.occurrences.length)
            needed.push("occurrences");
        if (!current.maxParticipants || current.maxParticipants < 1)
            needed.push("maxParticipants");
        if (!current.pricingType)
            needed.push("pricingType");
        if (current.pricingType && current.pricingType !== client_1.ResortEventPricingType.FREE && (!current.price || current.price.lte(0)))
            needed.push("price");
        if (current.accommodationIncluded === null)
            needed.push("accommodationIncluded");
        if (!current.whatsIncluded?.trim())
            needed.push("whatsIncluded");
        if (!current.cancellationPolicy?.trim())
            needed.push("cancellationPolicy");
        if (!current.images.some(i => i.kind === "COVER"))
            needed.push("coverPhoto");
        if (current.accommodationIncluded && !current.allocations.length)
            needed.push("roomAllocations");
        if (needed.length) {
            throw new resortManagement_service_1.ResortApiError(422, "EVENT_INCOMPLETE", `Complete the following fields: ${needed.join(", ")}.`);
        }
        for (const occ of current.occurrences) {
            const first = (0, resortManagement_service_1.dayKey)((0, resortManagement_service_1.localDate)(occ.startAt, occ.timeZone));
            const last = (0, resortManagement_service_1.dayKey)((0, resortManagement_service_1.localDate)(occ.endAt, occ.timeZone));
            if (current.listingType === client_1.ResortEventType.MULTI_DAY_RETREAT && first === last) {
                throw new resortManagement_service_1.ResortApiError(422, "INVALID_RETREAT_DATES", "A multi-day retreat must span more than one local calendar day.");
            }
            if (current.listingType === client_1.ResortEventType.DAY_PROGRAMME && first !== last) {
                throw new resortManagement_service_1.ResortApiError(422, "INVALID_DAY_PROGRAMME", "A day programme must begin and end on the same local calendar day.");
            }
        }
        await tx.resortEventRoomHold.deleteMany({ where: { eventId: current.id } });
        if (current.accommodationIncluded) {
            for (const occurrence of current.occurrences) {
                const { start, endExclusive } = (0, resortManagement_service_1.eventNights)(occurrence.startAt, occurrence.endAt, occurrence.timeZone);
                (0, resortManagement_service_1.dateRange)(start, endExclusive);
                for (const allocation of current.allocations) {
                    const type = await (0, resortManagement_service_1.roomTypeFor)(tx, property.id, allocation.roomTypeId);
                    if (allocation.quantity > type.quantity) {
                        throw new resortManagement_service_1.ResortApiError(409, "NOT_ENOUGH_ROOMS", `Only ${type.quantity} rooms exist in ${type.name}.`);
                    }
                    const units = await tx.resortRoomUnit.findMany({
                        where: { propertyId: property.id, roomTypeId: type.id }, orderBy: { number: "asc" },
                    });
                    if (units.length < allocation.quantity) {
                        throw new resortManagement_service_1.ResortApiError(409, "ASSIGN_ROOM_NUMBERS", `Assign at least ${allocation.quantity} room numbers to ${type.name} before publishing.`);
                    }
                    let chosen = 0;
                    for (const unit of units) {
                        if (chosen >= allocation.quantity)
                            break;
                        try {
                            await (0, resortManagement_service_1.ensureUnitFree)(tx, property.id, type.id, unit.id, start, endExclusive);
                        }
                        catch (error) {
                            if (error instanceof resortManagement_service_1.ResortApiError && error.code === "ROOM_UNAVAILABLE")
                                continue;
                            throw error;
                        }
                        await (0, resortManagement_service_1.ensureAvailable)(tx, {
                            propertyId: property.id, roomTypeId: type.id, from: start,
                            until: endExclusive, roomUnitId: unit.id,
                        });
                        await tx.resortEventRoomHold.create({
                            data: { propertyId: property.id, eventId: current.id, occurrenceId: occurrence.id,
                                roomUnitId: unit.id, startDate: start, endDateExclusive: endExclusive },
                        });
                        chosen++;
                    }
                    if (chosen !== allocation.quantity) {
                        throw new resortManagement_service_1.ResortApiError(409, "ROOMS_NOT_AVAILABLE", `Not enough unblocked ${type.name} rooms for this event occurrence.`);
                    }
                }
            }
        }
        await tx.resortEvent.update({
            where: { id: current.id },
            data: { status: client_1.ResortEventStatus.PUBLISHED, draftStep: 6, publishedAt: current.publishedAt ?? new Date() },
        });
        return tx.resortEvent.findUniqueOrThrow({ where: { id: current.id }, include: details });
    });
    res.json({ message: "Event or retreat published successfully.", event: published });
});
// POST /api/resort-owner/properties/:propertyId/events/:eventId/unpublish
exports.unpublishEvent = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    const updated = await (0, resortManagement_service_1.transaction)(async (tx) => {
        await tx.resortEventRoomHold.deleteMany({ where: { eventId: event.id } });
        return tx.resortEvent.update({ where: { id: event.id }, data: { status: client_1.ResortEventStatus.UNPUBLISHED }, include: details });
    });
    res.json({ message: "Event unpublished.", event: updated });
});
// DELETE /api/resort-owner/properties/:propertyId/events/:eventId
exports.deleteEvent = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    if (event.status === client_1.ResortEventStatus.PUBLISHED) {
        throw new resortManagement_service_1.ResortApiError(409, "EVENT_IS_PUBLISHED", "Unpublish the event before deleting it.");
    }
    const images = await resortManagement_service_1.prisma.resortEventImage.findMany({ where: { eventId: event.id }, select: { pathname: true } });
    await resortManagement_service_1.prisma.resortEvent.delete({ where: { id: event.id } });
    const token = process.env.RESORT_IMAGE_BLOB_READ_WRITE_TOKEN?.trim();
    const storeId = process.env.RESORT_IMAGE_BLOB_STORE_ID?.trim();
    if (token && storeId) {
        for (const image of images) {
            await (0, blob_1.del)(image.pathname, { token, storeId }).catch(error => console.error("Event image cleanup:", error));
        }
    }
    res.json({ message: "Event deleted." });
});
