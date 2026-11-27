import {
  Prisma,
  ResortEventPricingType,
  ResortEventStatus,
  ResortEventType,
} from "@prisma/client";
import { del } from "@vercel/blob";
import {
  guarded, ownedProperty, ownedEvent, prisma, transaction,
  optionalText, requiredText, wholeNumber, validTimeZone, parseDateTime,
  eventNights, localDate, dayKey, dateRange, ensureAvailable, ensureUnitFree,
  roomTypeFor, ResortApiError, Tx,
} from "../services/resortManagement.service";

const details = {
  occurrences: { orderBy: { startAt: "asc" as const } },
  allocations: { include: { roomType: { select: { id: true, name: true, quantity: true } } } },
  images: { orderBy: { sortOrder: "asc" as const } },
  childrenDetails: true,
};

type MutableEvent = Partial<{
  draftStep: number;
  listingType: ResortEventType | null;
  name: string | null;
  shortDescription: string | null;
  venue: string | null;
  maxParticipants: number | null;
  minParticipants: number | null;
  ageRequirements: string | null;
  experienceLevel: string | null;
  pricingType: ResortEventPricingType | null;
  currency: string;
  price: Prisma.Decimal | null;
  accommodationIncluded: boolean | null;
  whatsIncluded: string | null;
  whatToBring: string | null;
  whatsNotIncluded: string | null;
  cancellationPolicy: string | null;
}>;

function scalarChanges(body: Record<string, unknown>): MutableEvent {
  const data: MutableEvent = {};
  if (Object.prototype.hasOwnProperty.call(body, "draftStep")) {
    data.draftStep = wholeNumber(body.draftStep, "draftStep", 1, 6);
  }
  if (Object.prototype.hasOwnProperty.call(body, "listingType")) {
    const v = body.listingType;
    if (v !== null && !Object.values(ResortEventType).includes(v as ResortEventType)) {
      throw new ResortApiError(422, "INVALID_EVENT_TYPE", "Unknown listing type.");
    }
    data.listingType = v as ResortEventType | null;
  }
  const texts = [
    "name", "shortDescription", "venue", "ageRequirements", "experienceLevel",
    "whatsIncluded", "whatToBring", "whatsNotIncluded", "cancellationPolicy",
  ] as const;
  for (const key of texts) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const max = key === "shortDescription" || key === "whatsIncluded" || key === "whatToBring" || key === "whatsNotIncluded" || key === "cancellationPolicy" ? 10000 : 300;
      data[key] = optionalText(body[key], key, max);
    }
  }
  for (const key of ["maxParticipants", "minParticipants"] as const) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      data[key] = body[key] === null || body[key] === "" ? null : wholeNumber(body[key], key, key === "maxParticipants" ? 1 : 0, 100000);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "pricingType")) {
    const v = body.pricingType;
    if (v !== null && !Object.values(ResortEventPricingType).includes(v as ResortEventPricingType)) {
      throw new ResortApiError(422, "INVALID_PRICING_TYPE", "Unknown pricing type.");
    }
    data.pricingType = v as ResortEventPricingType | null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "currency")) {
    const v = requiredText(body.currency, "currency", 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(v)) throw new ResortApiError(422, "INVALID_CURRENCY", "Use a three-letter currency code.");
    data.currency = v;
  }
  if (Object.prototype.hasOwnProperty.call(body, "price")) {
    if (body.price === null || body.price === "") data.price = null;
    else {
      const raw = String(body.price);
      if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) {
        throw new ResortApiError(422, "INVALID_PRICE", "Enter a non-negative price with at most two decimal places.");
      }
      data.price = new Prisma.Decimal(raw);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "accommodationIncluded")) {
    if (body.accommodationIncluded !== null && typeof body.accommodationIncluded !== "boolean") {
      throw new ResortApiError(422, "INVALID_ACCOMMODATION", "accommodationIncluded must be true, false or null.");
    }
    data.accommodationIncluded = body.accommodationIncluded as boolean | null;
  }
  return data;
}

// A child listing is an ordinary event (or multi-day retreat) with a
// one-to-one child-specific record. No changes to the existing event enum.
const CHILD_AGE_GROUPS = new Set(["4-7", "8-12", "13-17", "OTHER"]);
const GUARDIAN_POLICIES = new Set([
  "REQUIRED_TO_STAY", "WELCOME_TO_STAY", "DROP_OFF_PICK_UP",
]);

type ChildrenData = {
  ageGroups?: string[];
  minimumAge?: number | null;
  maximumAge?: number | null;
  guardianPolicy?: string | null;
  maxAccompanyingAdultsPerChild?: number | null;
  guardianParticipationIncluded?: boolean | null;
  additionalAdultPrice?: Prisma.Decimal | null;
  childrenPerPackage?: number | null;
  guardianInstructions?: string | null;
};

function parsedChildrenDetails(value: unknown): ChildrenData | null {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ResortApiError(422, "INVALID_CHILD_DETAILS", "childrenDetails must be an object or null.");
  }
  const body = value as Record<string, unknown>;
  const result: ChildrenData = {};
  if (Object.prototype.hasOwnProperty.call(body, "ageGroups")) {
    if (!Array.isArray(body.ageGroups) || body.ageGroups.some(v => typeof v !== "string" || !CHILD_AGE_GROUPS.has(v))) {
      throw new ResortApiError(422, "INVALID_AGE_GROUPS", "Choose age groups 4-7, 8-12, 13-17 or OTHER.");
    }
    const groups = body.ageGroups as string[];
    result.ageGroups = [...new Set(groups)];
  }
  for (const key of ["minimumAge", "maximumAge"] as const) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      result[key] = body[key] === null || body[key] === "" ? null : wholeNumber(body[key], key, 0, 17);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "guardianPolicy")) {
    const val = body.guardianPolicy;
    if (val !== null && (typeof val !== "string" || !GUARDIAN_POLICIES.has(val))) {
      throw new ResortApiError(422, "INVALID_GUARDIAN_POLICY", "Choose a valid guardian participation policy.");
    }
    result.guardianPolicy = val as string | null;
  }
  for (const key of ["maxAccompanyingAdultsPerChild", "childrenPerPackage"] as const) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      result[key] = body[key] === null || body[key] === "" ? null : wholeNumber(body[key], key, key === "childrenPerPackage" ? 1 : 0, 100);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "guardianParticipationIncluded")) {
    const val = body.guardianParticipationIncluded;
    if (val !== null && typeof val !== "boolean") {
      throw new ResortApiError(422, "INVALID_GUARDIAN_INCLUDED", "guardianParticipationIncluded must be true, false or null.");
    }
    result.guardianParticipationIncluded = val as boolean | null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "additionalAdultPrice")) {
    const val = body.additionalAdultPrice;
    if (val === null || val === "") result.additionalAdultPrice = null;
    else if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(val))) {
      throw new ResortApiError(422, "INVALID_ADULT_PRICE", "Enter a valid non-negative adult price.");
    } else result.additionalAdultPrice = new Prisma.Decimal(String(val));
  }
  if (Object.prototype.hasOwnProperty.call(body, "guardianInstructions")) {
    result.guardianInstructions = optionalText(body.guardianInstructions, "guardianInstructions", 10000);
  }
  const min = result.minimumAge;
  const max = result.maximumAge;
  if (min != null && max != null && min > max) {
    throw new ResortApiError(422, "INVALID_AGE_RANGE", "Minimum age cannot exceed maximum age.");
  }
  return result;
}

function parsedOccurrences(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) {
    throw new ResortApiError(422, "INVALID_OCCURRENCES", "occurrences must be an array with no more than 50 schedules.");
  }
  return value.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new ResortApiError(422, "INVALID_OCCURRENCE", `Occurrence ${index + 1} is invalid.`);
    }
    const startAt = parseDateTime(row.startAt, "startAt");
    const endAt = parseDateTime(row.endAt, "endAt");
    const timeZone = validTimeZone(row.timeZone);
    if (endAt.getTime() <= startAt.getTime() || endAt.getTime() - startAt.getTime() > 90 * 86400000) {
      throw new ResortApiError(422, "INVALID_OCCURRENCE", "An occurrence must last more than zero hours and no longer than 90 days.");
    }
    const schedule = requiredText(row.schedule, "schedule", 15000);
    return { startAt, endAt, timeZone, schedule };
  });
}

function parsedAllocations(value: unknown) {
  if (!Array.isArray(value) || value.length > 30) {
    throw new ResortApiError(422, "INVALID_ALLOCATIONS", "roomAllocations must be an array with no more than 30 room types.");
  }
  const rows = value.map((row, i) => {
    const roomTypeId = requiredText(row?.roomTypeId, `roomAllocations[${i}].roomTypeId`, 80);
    const quantity = wholeNumber(row?.quantity, "reserved room quantity", 1, 10000);
    return { roomTypeId, quantity };
  });
  if (new Set(rows.map(r => r.roomTypeId)).size !== rows.length) {
    throw new ResortApiError(422, "DUPLICATE_ALLOCATIONS", "A room type can be selected only once per event.");
  }
  return rows;
}

async function replaceEventDetails(tx: Tx, propertyId: string, eventId: string, body: Record<string, unknown>) {
  const data = scalarChanges(body);
  if (data.maxParticipants !== undefined || data.minParticipants !== undefined) {
    const current = await tx.resortEvent.findUniqueOrThrow({ where: { id: eventId } });
    const max = data.maxParticipants !== undefined ? data.maxParticipants : current.maxParticipants;
    const min = data.minParticipants !== undefined ? data.minParticipants : current.minParticipants;
    if (max !== null && min !== null && min > max) {
      throw new ResortApiError(422, "INVALID_CAPACITY", "Minimum participants cannot exceed maximum participants.");
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
      const type = await roomTypeFor(tx, propertyId, row.roomTypeId);
      if (row.quantity > type.quantity) {
        throw new ResortApiError(422, "INVALID_ALLOCATION", `Cannot reserve more than ${type.quantity} ${type.name} rooms.`);
      }
    }
    await tx.resortEventRoomAllocation.deleteMany({ where: { eventId } });
    if (allocations.length) {
      await tx.resortEventRoomAllocation.createMany({ data: allocations.map(row => ({ ...row, eventId })) });
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "childrenDetails")) {
    const changes = parsedChildrenDetails(body.childrenDetails);
    if (changes === null) {
      await tx.resortChildrenEventDetails.deleteMany({ where: { eventId } });
    } else {
      await tx.resortChildrenEventDetails.upsert({
        where: { eventId },
        create: { eventId, ...changes },
        update: changes,
      });
    }
  }
  return tx.resortEvent.findUniqueOrThrow({ where: { id: eventId }, include: details });
}

// POST /api/resort-owner/properties/:propertyId/events
// Accepts any initial step-1 fields, or an empty body to start a draft.
export const createEvent = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const body = req.body ?? {};
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new ResortApiError(422, "INVALID_BODY", "Provide a JSON object.");
  }
  const event = await transaction(async tx => {
    const draft = await tx.resortEvent.create({ data: { propertyId: property.id } });
    return replaceEventDetails(tx, property.id, draft.id, body);
  });
  res.status(201).json({ event });
});

// GET /api/resort-owner/properties/:propertyId/events
export const listEvents = guarded(async (req, res) => {
  const property = await ownedProperty(req);
  const events = await prisma.resortEvent.findMany({
    where: { propertyId: property.id },
    orderBy: { updatedAt: "desc" },
    include: details,
  });
  res.json({ events });
});

// GET /api/resort-owner/properties/:propertyId/events/:eventId
export const getEvent = guarded(async (req, res) => {
  const { event } = await ownedEvent(req, String(req.params.eventId));
  const record = await prisma.resortEvent.findUniqueOrThrow({ where: { id: event.id }, include: details });
  res.json({ event: record });
});

// PATCH /api/resort-owner/properties/:propertyId/events/:eventId
// Save-draft accepts scalar fields plus full replacement arrays:
// occurrences: [{startAt,endAt,timeZone,schedule}]
// roomAllocations: [{roomTypeId,quantity}]
export const updateEvent = guarded(async (req, res) => {
  const { property, event } = await ownedEvent(req, String(req.params.eventId));
  const body = req.body ?? {};
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new ResortApiError(422, "INVALID_BODY", "Provide a JSON object.");
  }
  const updated = await transaction(async tx => {
    const current = await tx.resortEvent.findUniqueOrThrow({ where: { id: event.id } });
    if (current.status === ResortEventStatus.PUBLISHED) {
      throw new ResortApiError(409, "EVENT_IS_PUBLISHED", "Unpublish the event before editing its schedule or pricing.");
    }
    return replaceEventDetails(tx, property.id, event.id, body);
  });
  res.json({ event: updated });
});

// POST /api/resort-owner/properties/:propertyId/events/:eventId/publish
export const publishEvent = guarded(async (req, res) => {
  const { property, event } = await ownedEvent(req, String(req.params.eventId));
  if (property.status !== "PUBLISHED" || !property.onboardingCompleted) {
    throw new ResortApiError(409, "PROPERTY_NOT_PUBLISHED", "Publish the parent property before publishing events.");
  }
  const published = await transaction(async tx => {
    const current = await tx.resortEvent.findUniqueOrThrow({ where: { id: event.id }, include: details });
    if (current.status === ResortEventStatus.PUBLISHED) return current;
    const needed: string[] = [];
    if (!current.listingType) needed.push("listingType");
    if (!current.name?.trim()) needed.push("name");
    if (!current.shortDescription?.trim()) needed.push("shortDescription");
    if (!current.venue?.trim()) needed.push("venue");
    if (!current.occurrences.length) needed.push("occurrences");
    if (!current.maxParticipants || current.maxParticipants < 1) needed.push("maxParticipants");
    if (!current.pricingType) needed.push("pricingType");
    if (current.pricingType && current.pricingType !== ResortEventPricingType.FREE && (!current.price || current.price.lte(0))) needed.push("price");
    if (current.accommodationIncluded === null) needed.push("accommodationIncluded");
    if (!current.whatsIncluded?.trim()) needed.push("whatsIncluded");
    if (!current.cancellationPolicy?.trim()) needed.push("cancellationPolicy");
    if (!current.images.some(i => i.kind === "COVER")) needed.push("coverPhoto");
    if (current.accommodationIncluded && !current.allocations.length) needed.push("roomAllocations");
    if (current.childrenDetails) {
      const child = current.childrenDetails;
      if (!child.ageGroups.length) needed.push("childrenDetails.ageGroups");
      if (child.ageGroups.includes("OTHER") &&
        (child.minimumAge === null || child.maximumAge === null || child.minimumAge > child.maximumAge)) {
        needed.push("childrenDetails.minimumAge/maximumAge");
      }
      if (!child.guardianPolicy) needed.push("childrenDetails.guardianPolicy");
      if (child.guardianPolicy !== "DROP_OFF_PICK_UP" && child.guardianParticipationIncluded === null) {
        needed.push("childrenDetails.guardianParticipationIncluded");
      }
      if (current.pricingType === ResortEventPricingType.PER_PACKAGE && !child.childrenPerPackage) {
        needed.push("childrenDetails.childrenPerPackage");
      }
    }
    if (needed.length) {
      throw new ResortApiError(422, "EVENT_INCOMPLETE", `Complete the following fields: ${needed.join(", ")}.`);
    }
    for (const occ of current.occurrences) {
      const first = dayKey(localDate(occ.startAt, occ.timeZone));
      const last = dayKey(localDate(occ.endAt, occ.timeZone));
      if (current.listingType === ResortEventType.MULTI_DAY_RETREAT && first === last) {
        throw new ResortApiError(422, "INVALID_RETREAT_DATES", "A multi-day retreat must span more than one local calendar day.");
      }
      if (current.listingType === ResortEventType.DAY_PROGRAMME && first !== last) {
        throw new ResortApiError(422, "INVALID_DAY_PROGRAMME", "A day programme must begin and end on the same local calendar day.");
      }
    }
    await tx.resortEventRoomHold.deleteMany({ where: { eventId: current.id } });
    if (current.accommodationIncluded) {
      for (const occurrence of current.occurrences) {
        const { start, endExclusive } = eventNights(occurrence.startAt, occurrence.endAt, occurrence.timeZone);
        dateRange(start, endExclusive);
        for (const allocation of current.allocations) {
          const type = await roomTypeFor(tx, property.id, allocation.roomTypeId);
          if (allocation.quantity > type.quantity) {
            throw new ResortApiError(409, "NOT_ENOUGH_ROOMS", `Only ${type.quantity} rooms exist in ${type.name}.`);
          }
          const units = await tx.resortRoomUnit.findMany({
            where: { propertyId: property.id, roomTypeId: type.id }, orderBy: { number: "asc" },
          });
          if (units.length < allocation.quantity) {
            throw new ResortApiError(409, "ASSIGN_ROOM_NUMBERS", `Assign at least ${allocation.quantity} room numbers to ${type.name} before publishing.`);
          }
          let chosen = 0;
          for (const unit of units) {
            if (chosen >= allocation.quantity) break;
            try {
              await ensureUnitFree(tx, property.id, type.id, unit.id, start, endExclusive);
            } catch (error) {
              if (error instanceof ResortApiError && error.code === "ROOM_UNAVAILABLE") continue;
              throw error;
            }
            await ensureAvailable(tx, {
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
            throw new ResortApiError(409, "ROOMS_NOT_AVAILABLE", `Not enough unblocked ${type.name} rooms for this event occurrence.`);
          }
        }
      }
    }
    await tx.resortEvent.update({
      where: { id: current.id },
      data: { status: ResortEventStatus.PUBLISHED, draftStep: 6, publishedAt: current.publishedAt ?? new Date() },
    });
    return tx.resortEvent.findUniqueOrThrow({ where: { id: current.id }, include: details });
  });
  res.json({ message: "Event or retreat published successfully.", event: published });
});

// POST /api/resort-owner/properties/:propertyId/events/:eventId/unpublish
export const unpublishEvent = guarded(async (req, res) => {
  const { event } = await ownedEvent(req, String(req.params.eventId));
  const updated = await transaction(async tx => {
    await tx.resortEventRoomHold.deleteMany({ where: { eventId: event.id } });
    return tx.resortEvent.update({ where: { id: event.id }, data: { status: ResortEventStatus.UNPUBLISHED }, include: details });
  });
  res.json({ message: "Event unpublished.", event: updated });
});

// DELETE /api/resort-owner/properties/:propertyId/events/:eventId
export const deleteEvent = guarded(async (req, res) => {
  const { event } = await ownedEvent(req, String(req.params.eventId));
  if (event.status === ResortEventStatus.PUBLISHED) {
    throw new ResortApiError(409, "EVENT_IS_PUBLISHED", "Unpublish the event before deleting it.");
  }
  const images = await prisma.resortEventImage.findMany({ where: { eventId: event.id }, select: { pathname: true } });
  await prisma.resortEvent.delete({ where: { id: event.id } });
  const token = process.env.RESORT_IMAGE_BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = process.env.RESORT_IMAGE_BLOB_STORE_ID?.trim();
  if (token && storeId) {
    for (const image of images) {
      await del(image.pathname, { token, storeId }).catch(error => console.error("Event image cleanup:", error));
    }
  }
  res.json({ message: "Event deleted." });
});
