import { Request, Response } from "express";
import {
  Prisma,
  PrismaClient,
  ResortEventStatus,
  ResortPropertyStatus,
  ResortEventType,
} from "@prisma/client";

const prisma = new PrismaClient();

const PUBLIC_PROPERTY = {
  id: true,
  slug: true,
  name: true,
  propertyType: true,
  resortRating: true,
  city: true,
  stateRegion: true,
  country: true,
} as const;

function publicOnly(): Prisma.ResortEventWhereInput {
  return {
    status: ResortEventStatus.PUBLISHED,
    property: {
      is: {
        status: ResortPropertyStatus.PUBLISHED,
        onboardingCompleted: true,
      },
    },
  };
}

function wholeNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function optionalQuery(value: unknown, maximum = 100) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function dateBounds(text: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const start = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== text) return null;
  return { start, end: new Date(start.getTime() + 86400000) };
}

/** GET /api/resorts/events : public, read-only, published events only. */
export async function listPublishedResortEvents(req: Request, res: Response) {
  try {
    const page = wholeNumber(req.query.page, 1, 1, 100000);
    const limit = wholeNumber(req.query.limit, 20, 1, 50);
    const search = optionalQuery(req.query.search);
    const city = optionalQuery(req.query.city);
    const requestedType = optionalQuery(req.query.type);
    const dateText = optionalQuery(req.query.date, 10);
    const bounds = dateText ? dateBounds(dateText) : null;

    if (dateText && !bounds) {
      res.status(400).json({ message: "date must be a valid YYYY-MM-DD date." });
      return;
    }
    if (requestedType && !Object.values(ResortEventType).includes(requestedType as ResortEventType)) {
      res.status(400).json({ message: "Invalid event type." });
      return;
    }

    const now = new Date();
    const where: Prisma.ResortEventWhereInput = {
      ...publicOnly(),
      ...(requestedType ? { listingType: requestedType as ResortEventType } : {}),
      ...(city ? {
        property: { is: {
          status: ResortPropertyStatus.PUBLISHED,
          onboardingCompleted: true,
          city: { contains: city, mode: "insensitive" },
        } },
      } : {}),
      occurrences: { some: bounds
        ? { startAt: { lt: bounds.end }, endAt: { gte: now > bounds.start ? now : bounds.start } }
        : { endAt: { gte: now } },
      },
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { venue: { contains: search, mode: "insensitive" } },
        { property: { is: { name: { contains: search, mode: "insensitive" } } } },
        { property: { is: { city: { contains: search, mode: "insensitive" } } } },
      ] } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.resortEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          listingType: true,
          name: true,
          shortDescription: true,
          venue: true,
          maxParticipants: true,
          pricingType: true,
          currency: true,
          price: true,
          accommodationIncluded: true,
          publishedAt: true,
          property: { select: PUBLIC_PROPERTY },
          images: { where: { kind: "COVER" }, select: { url: true }, take: 1 },
          occurrences: {
            where: { endAt: { gte: now } },
            select: { id: true, startAt: true, endAt: true, timeZone: true },
            orderBy: { startAt: "asc" },
            take: 5,
          },
        },
      }),
      prisma.resortEvent.count({ where }),
    ]);

    res.json({
      events: rows.map(({ images, ...row }) => ({
        ...row,
        coverUrl: images[0]?.url ?? null,
        nextOccurrence: row.occurrences[0] ?? null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Public resort events list:", error);
    res.status(500).json({ message: "Unable to load published retreats and events." });
  }
}

/** GET /api/resorts/events/:eventId : only published events and properties. */
export async function getPublishedResortEvent(req: Request, res: Response) {
  try {
    const event = await prisma.resortEvent.findFirst({
      where: { ...publicOnly(), id: String(req.params.eventId) },
      select: {
        id: true,
        listingType: true,
        name: true,
        shortDescription: true,
        venue: true,
        maxParticipants: true,
        minParticipants: true,
        ageRequirements: true,
        experienceLevel: true,
        pricingType: true,
        currency: true,
        price: true,
        accommodationIncluded: true,
        whatsIncluded: true,
        whatToBring: true,
        whatsNotIncluded: true,
        cancellationPolicy: true,
        publishedAt: true,
        property: { select: PUBLIC_PROPERTY },
        images: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }], select: { kind: true, url: true } },
        occurrences: {
          where: { endAt: { gte: new Date() } },
          select: { id: true, startAt: true, endAt: true, timeZone: true, schedule: true },
          orderBy: { startAt: "asc" },
        },
      },
    });
    if (!event) {
      res.status(404).json({ message: "Published event not found." });
      return;
    }
    res.json({ event });
  } catch (error) {
    console.error("Public resort event detail:", error);
    res.status(500).json({ message: "Unable to load event details." });
  }
}
