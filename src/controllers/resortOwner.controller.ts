import { Response } from "express";
import { randomBytes } from "crypto";
import { Prisma, PrismaClient, ResortPropertyStatus, UserRole } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

const prisma = new PrismaClient();

type Handler = (req: AuthRequest, res: Response) => Promise<unknown>;
const wrap = (handler: Handler) => async (req: AuthRequest, res: Response) => {
  try { await handler(req, res); }
  catch (error) {
    console.error("Resort API error:", error);
    res.status(500).json({ status: "error", code: "RESORT_ERROR", message: "Unable to process resort request." });
  }
};

const str = (v: unknown) => typeof v === "string" ? v.trim() : "";
const field = (v: unknown) => v === null ? null : str(v) || null;
const uniqueStrings = (v: unknown) => Array.isArray(v)
  ? [...new Set(v.filter((x): x is string => typeof x === "string").map(x => x.trim()).filter(Boolean))] : [];
const own = (req: AuthRequest) => req.user?.userId || "";
const slug = (name: string) => `${name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "property"}-${randomBytes(5).toString("hex")}`;
const info = { rooms: { include: { beds: true, units: { orderBy: { number: "asc" as const } }, images: { orderBy: { sortOrder: "asc" as const } } }, orderBy: { createdAt: "asc" as const } }, images: { orderBy: { sortOrder: "asc" as const } } };

async function ownedProperty(req: AuthRequest) {
  return prisma.resortProperty.findFirst({
    where: { id: String(req.params.propertyId || ""), owner: { userId: own(req) } },
    include: info,
  });
}
const invalid = (res: Response, fields: string[]) => res.status(422).json({ status: "error", code: "VALIDATION_FAILED", fields, message: "Complete the required fields before publishing." });
const validUrl = (v: string) => { try { const url = new URL(v); return ["https:", "http:"].includes(url.protocol); } catch { return false; } };
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const propertyTypes = ["RESORT", "WELLNESS_CENTRE", "YOGA_CENTRE", "AYURVEDA_CENTRE", "MEDITATION_CENTRE", "SPA", "NATURE_RESORT", "FITNESS_CENTRE", "OTHER"];
const amenityGroups: Record<string, string[]> = {
  BASIC: ["WIFI", "PARKING", "AIR_CONDITIONING", "HOUSEKEEPING", "LAUNDRY_SERVICE"],
  PROPERTY_FEATURES: ["SWIMMING_POOL", "RESTAURANT", "GARDEN", "LIBRARY", "RELAXATION_LOUNGE", "OUTDOOR_SPACE"],
  WELLNESS: ["YOGA_STUDIO", "MEDITATION_SPACE", "SPA_ROOMS", "STEAM_ROOM", "PRIVATE_CONSULTATION_ROOM"],
  SURROUNDINGS: ["BEACHFRONT", "NEAR_BEACH", "MOUNTAIN_SETTING", "FOREST_SETTING", "LAKESIDE", "RIVERSIDE", "COUNTRYSIDE", "CITY_SETTING"],
  ACCESSIBILITY: ["STEP_FREE_ENTRANCE", "WHEELCHAIRS_AVAILABLE", "WHEELCHAIR_ACCESSIBLE_PATHS", "LIFT_ACCESS"],
  SAFETY: ["ON_SITE_SECURITY", "CCTV", "FIRE_EXTINGUISHERS", "SMOKE_ALARMS", "FIRST_AID_KIT", "IN_ROOM_SAFE"],
};
const allowedAmenities = new Set(Object.values(amenityGroups).flat());
const allowedFeatures = new Set(["WIFI", "AIR_CONDITIONING", "PRIVATE_BATHROOM", "BALCONY", "GARDEN_VIEW", "RIVER_VIEW", "IN_ROOM_SAFE", "TEA_COFFEE_MAKER", "OTHER"]);
const allowedMeals = new Set(["BREAKFAST", "LUNCH", "DINNER"]);

export const getResortCatalog = wrap(async (_req, res) => {
  res.json({ propertyTypes, amenities: amenityGroups, roomFeatures: [...allowedFeatures], includedMeals: [...allowedMeals], smoking: ["YES", "DESIGNATED_AREAS_ONLY", "NO"], pets: ["YES", "ON_REQUEST", "NO"], alcohol: ["YES", "NO"] });
});

export const listMyProperties = wrap(async (req, res) => {
  const properties = await prisma.resortProperty.findMany({ where: { owner: { userId: own(req) } }, orderBy: { updatedAt: "desc" }, include: info });
  res.json({ properties });
});

export const createProperty = wrap(async (req, res) => {
  const userId = own(req);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== UserRole.RESORT_OWNER) return void res.status(403).json({ message: "Resort owner access required" });
  const owner = await prisma.resortOwnerProfile.upsert({ where: { userId }, update: {}, create: { userId } });
  const name = str(req.body?.name);
  const property = await prisma.resortProperty.create({ data: { ownerId: owner.id, name: name || null, slug: slug(name) }, include: info });
  res.status(201).json({ property });
});

export const getMyProperty = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  res.json({ property });
});

const sections: Record<string, { step: number; fields: string[] }> = {
  basic: { step: 1, fields: ["name", "resortRating", "websiteUrl", "propertyType", "description"] },
  location: { step: 2, fields: ["country", "addressLine1", "addressLine2", "city", "stateRegion", "postalCode", "googleMapsUrl"] },
  amenities: { step: 3, fields: ["amenities"] },
  photos: { step: 4, fields: [] },
  rooms: { step: 5, fields: [] },
  contact: { step: 6, fields: ["contactName", "enquiryEmail", "phoneNumber"] },
  rules: { step: 7, fields: ["smokingPolicy", "petsPolicy", "alcoholPolicy", "additionalRules"] },
};

export const updatePropertySection = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const section = sections[String(req.params.section)];
  if (!section) return void res.status(404).json({ message: "Unknown onboarding section" });
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return void res.status(400).json({ message: "Invalid request body" });
  const data: Record<string, unknown> = {};
  for (const key of section.fields) {
    if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue;
    if (key === "amenities") {
      if (!Array.isArray(req.body[key])) return void res.status(400).json({ message: "amenities must be an array" });
      const values = uniqueStrings(req.body[key]);
      if (values.some(x => !allowedAmenities.has(x))) return void res.status(400).json({ message: "Unknown amenity code" });
      data[key] = values;
    } else {
      if (req.body[key] !== null && typeof req.body[key] !== "string") return void res.status(400).json({ message: `${key} must be text` });
      data[key] = field(req.body[key]);
    }
  }
  if (data.resortRating !== undefined && data.resortRating !== null) {
    const rating = Number(data.resortRating);
    if (!/^\d(?:\.\d{1,2})?$/.test(String(data.resortRating)) || !Number.isFinite(rating) || rating < 0 || rating > 5) {
      return void res.status(400).json({ message: "Resort rating must be a number from 0 to 5, with up to two decimal places." });
    }
  }
  if (data.propertyType && !propertyTypes.includes(String(data.propertyType))) return void res.status(400).json({ message: "Unknown property type" });
  for (const urlField of ["websiteUrl", "googleMapsUrl"]) {
    if (data[urlField] && !validUrl(String(data[urlField]))) return void res.status(400).json({ message: `Invalid ${urlField}` });
  }
  if (data.enquiryEmail && !emailRe.test(String(data.enquiryEmail))) return void res.status(400).json({ message: "Invalid enquiry email" });
  for (const [key, choices] of Object.entries({ smokingPolicy: ["YES", "DESIGNATED_AREAS_ONLY", "NO"], petsPolicy: ["YES", "ON_REQUEST", "NO"], alcoholPolicy: ["YES", "NO"] })) {
    if (data[key] && !choices.includes(String(data[key]))) return void res.status(400).json({ message: `Invalid ${key}` });
  }
  if (property.status === ResortPropertyStatus.PUBLISHED) {
    const mustKeep = ["name", "resortRating", "websiteUrl", "propertyType", "description", "country", "addressLine1", "city", "stateRegion", "postalCode", "googleMapsUrl", "contactName", "enquiryEmail", "phoneNumber", "smokingPolicy", "petsPolicy", "alcoholPolicy"];
    if (mustKeep.some(x => x in data && !data[x])) return void res.status(422).json({ message: "Published listings cannot clear required fields" });
  }
  const updated = await prisma.resortProperty.update({
    where: { id: property.id },
    data: { ...data, onboardingStep: Math.max(property.onboardingStep, section.step + 1) },
    include: info,
  });
  res.json({ message: "Section saved", property: updated });
});

function parseRoom(body: any) {
  const errors: string[] = [];
  const name = str(body?.name);
  const quantity = Number(body?.quantity);
  const maxAdults = Number(body?.maxAdults);
  const maxChildren = Number(body?.maxChildren);
  if (!name) errors.push("name");
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) errors.push("quantity");
  if (!Number.isSafeInteger(maxAdults) || maxAdults < 1 || maxAdults > 100) errors.push("maxAdults");
  if (!Number.isSafeInteger(maxChildren) || maxChildren < 0 || maxChildren > 100) errors.push("maxChildren");
  if (!Array.isArray(body?.beds) || !body.beds.length) errors.push("beds");
  const beds = Array.isArray(body?.beds) ? body.beds.map((b: any) => ({ bedType: str(b?.bedType).toUpperCase(), quantity: Number(b?.quantity) })) : [];
  if (beds.some((b: any) => !b.bedType || b.bedType.length > 60 || !Number.isSafeInteger(b.quantity) || b.quantity < 1 || b.quantity > 100) || new Set(beds.map((b: any) => b.bedType)).size !== beds.length) errors.push("beds");
  const features = uniqueStrings(body?.features);
  const includedMeals = uniqueStrings(body?.includedMeals);
  if (body?.features !== undefined && (!Array.isArray(body.features) || features.some(x => !allowedFeatures.has(x)))) errors.push("features");
  if (body?.includedMeals !== undefined && (!Array.isArray(body.includedMeals) || includedMeals.some(x => !allowedMeals.has(x)))) errors.push("includedMeals");
  const currency = str(body?.currency || "INR").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.push("currency");
  const priceSupplied = body?.basePrice !== undefined && body?.basePrice !== null && body?.basePrice !== "";
  const rawPrice = priceSupplied ? String(body.basePrice) : null;
  if (rawPrice && (!/^\d{1,10}(\.\d{1,2})?$/.test(rawPrice) || new Prisma.Decimal(rawPrice).lte(0))) errors.push("basePrice");
  if (body?.description != null && typeof body.description !== "string") errors.push("description");
  return { errors, beds, data: { name, quantity, maxAdults, maxChildren, features, includedMeals, currency, basePrice: rawPrice ? new Prisma.Decimal(rawPrice) : null, description: field(body?.description) } };
}

export const createRoom = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const parsed = parseRoom(req.body);
  if (parsed.errors.length) return void invalid(res, parsed.errors);
  const room = await prisma.$transaction(async tx => {
    const r = await tx.resortRoomType.create({ data: { propertyId: property.id, ...parsed.data, beds: { create: parsed.beds } }, include: { beds: true, images: true } });
    await tx.resortProperty.update({ where: { id: property.id }, data: { onboardingStep: Math.max(property.onboardingStep, 6) } });
    return r;
  });
  res.status(201).json({ room });
});

export const updateRoom = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const existing = await prisma.resortRoomType.findFirst({ where: { id: String(req.params.roomId), propertyId: property.id }, include: { beds: true } });
  if (!existing) return void res.status(404).json({ message: "Room type not found" });
  const input = { ...existing, beds: existing.beds.map(b => ({ bedType: b.bedType, quantity: b.quantity })), ...req.body };
  const parsed = parseRoom(input);
  if (parsed.errors.length) return void invalid(res, parsed.errors);
  const numbered = await prisma.resortRoomUnit.count({ where: { roomTypeId: existing.id } });
  if (parsed.data.quantity < numbered) return void res.status(422).json({ code: "ROOM_QUANTITY_TOO_LOW", message: "Room quantity cannot be less than the number of assigned room numbers." });
  const room = await prisma.$transaction(async tx => {
    await tx.resortRoomBed.deleteMany({ where: { roomTypeId: existing.id } });
    return tx.resortRoomType.update({ where: { id: existing.id }, data: { ...parsed.data, beds: { create: parsed.beds } }, include: { beds: true, images: true } });
  });
  res.json({ room });
});

export const deleteRoom = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const room = await prisma.resortRoomType.findFirst({ where: { id: String(req.params.roomId), propertyId: property.id } });
  if (!room) return void res.status(404).json({ message: "Room type not found" });
  if (property.status === ResortPropertyStatus.PUBLISHED && property.rooms.length <= 1) return void res.status(409).json({ message: "A published property must have at least one room type" });
  // Remove unused physical room numbers before deleting the room type.
  // Historic reservations, blocks or event allocations prevent deletion.
  const used = await Promise.all([
    prisma.resortReservation.count({ where: { roomTypeId: room.id } }),
    prisma.resortEventRoomAllocation.count({ where: { roomTypeId: room.id } }),
    prisma.resortRoomBlock.count({ where: { roomUnit: { roomTypeId: room.id } } }),
    prisma.resortEventRoomHold.count({ where: { roomUnit: { roomTypeId: room.id } } }),
  ]);
  if (used.some(Boolean)) return void res.status(409).json({ code: "ROOM_IN_USE", message: "This room type has reservations, calendar blocks or retreat allocations and cannot be deleted." });
  await prisma.$transaction(async tx => {
    await tx.resortRoomUnit.deleteMany({ where: { roomTypeId: room.id } });
    await tx.resortRoomType.delete({ where: { id: room.id } });
  });
  res.json({ message: "Room type removed" });
});

function missingFields(p: NonNullable<Awaited<ReturnType<typeof ownedProperty>>>) {
  const required: Array<keyof typeof p> = ["name", "resortRating", "websiteUrl", "propertyType", "description", "country", "addressLine1", "city", "stateRegion", "postalCode", "googleMapsUrl", "contactName", "enquiryEmail", "phoneNumber", "smokingPolicy", "petsPolicy", "alcoholPolicy"];
  const missing = required.filter(k => !p[k]).map(String);
  if (p.websiteUrl && !validUrl(p.websiteUrl)) missing.push("websiteUrl");
  if (p.googleMapsUrl && !validUrl(p.googleMapsUrl)) missing.push("googleMapsUrl");
  if (p.enquiryEmail && !emailRe.test(p.enquiryEmail)) missing.push("enquiryEmail");
  if (!p.rooms.length) missing.push("rooms");
  return [...new Set(missing)];
}

export const reviewProperty = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const missing = missingFields(property);
  res.json({ property, readyToPublish: missing.length === 0, missingFields: missing });
});

export const publishProperty = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const missing = missingFields(property);
  if (missing.length) return void invalid(res, missing);
  if (req.body?.confirmedAccurate !== true) return void res.status(422).json({ message: "Please confirm the property details are accurate." });
  const updated = await prisma.resortProperty.update({ where: { id: property.id }, data: { status: ResortPropertyStatus.PUBLISHED, onboardingCompleted: true, onboardingStep: 8, confirmedAccurate: true, publishedAt: property.publishedAt ?? new Date() }, include: info });
  res.json({ message: "Property published successfully", property: updated });
});

export const changePropertyVisibility = wrap(async (req, res) => {
  const property = await ownedProperty(req);
  if (!property) return void res.status(404).json({ message: "Property not found" });
  const target = str(req.body?.status);
  if (target !== "PUBLISHED" && target !== "UNPUBLISHED") return void res.status(400).json({ message: "status must be PUBLISHED or UNPUBLISHED" });
  if (target === "PUBLISHED") {
    const missing = missingFields(property);
    if (missing.length) return void invalid(res, missing);
    if (!property.onboardingCompleted) return void res.status(409).json({ message: "Complete onboarding before publishing" });
  }
  const updated = await prisma.resortProperty.update({ where: { id: property.id }, data: { status: target as ResortPropertyStatus, publishedAt: target === "PUBLISHED" ? property.publishedAt ?? new Date() : property.publishedAt } });
  res.json({ property: updated });
});
