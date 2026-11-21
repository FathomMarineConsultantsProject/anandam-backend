import { Request, Response } from "express";
import { PrismaClient, ResortPropertyStatus, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export const listPublishedResorts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(req.query.limit) || 12)));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
    const where: Prisma.ResortPropertyWhereInput = {
      status: ResortPropertyStatus.PUBLISHED,
      onboardingCompleted: true,
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
      ...(type ? { propertyType: type } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }, { city: { contains: search, mode: "insensitive" } }] } : {}),
    };
    const [properties, total] = await Promise.all([
      prisma.resortProperty.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { publishedAt: "desc" }, select: { id: true, slug: true, name: true, propertyType: true, resortRating: true, city: true, country: true, description: true, images: { where: { kind: { in: ["COVER", "PROPERTY"] } }, select: { id: true, url: true, kind: true }, orderBy: { sortOrder: "asc" }, take: 5 }, rooms: { select: { id: true, name: true, currency: true, basePrice: true, quantity: true } } } }),
      prisma.resortProperty.count({ where }),
    ]);
    res.json({ properties, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { console.error(err); res.status(500).json({ message: "Unable to load resorts" }); }
};

export const getPublishedResort = async (req: Request, res: Response) => {
  try {
    const property = await prisma.resortProperty.findFirst({
      where: { slug: String(req.params.slug), status: ResortPropertyStatus.PUBLISHED, onboardingCompleted: true },
      select: {
        id: true, slug: true, name: true, resortRating: true, websiteUrl: true, propertyType: true, description: true,
        country: true, addressLine1: true, addressLine2: true, city: true, stateRegion: true, postalCode: true, googleMapsUrl: true,
        amenities: true, smokingPolicy: true, petsPolicy: true, alcoholPolicy: true, additionalRules: true,
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, kind: true, sortOrder: true } },
        rooms: { include: { beds: true, images: { select: { id: true, url: true, sortOrder: true }, orderBy: { sortOrder: "asc" } } } },
        publishedAt: true,
      },
    });
    if (!property) return void res.status(404).json({ message: "Resort not found" });
    res.json({ property });
  } catch (err) { console.error(err); res.status(500).json({ message: "Unable to load resort" }); }
};
