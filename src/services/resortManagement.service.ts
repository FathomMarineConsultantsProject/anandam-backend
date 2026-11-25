import { Request, Response } from "express";
import {
  Prisma,
  PrismaClient,
  ResortPropertyStatus,
  ResortReservationStatus,
} from "@prisma/client";
import { randomBytes } from "crypto";
import { AuthRequest } from "../middleware/auth.middleware";

export const prisma = new PrismaClient();
export type Tx = Prisma.TransactionClient;
export type ResortHandler = (req: AuthRequest, res: Response) => Promise<unknown>;

export class ResortApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = "ResortApiError";
  }
}

export function guarded(fn: ResortHandler) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      if (res.headersSent) return;
      if (error instanceof ResortApiError) {
        res.status(error.statusCode).json({ status: "error", code: error.code, message: error.message });
        return;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          res.status(409).json({ status: "error", code: "DUPLICATE", message: "This record already exists." });
          return;
        }
        if (error.code === "P2003" || error.code === "P2014") {
          res.status(409).json({ status: "error", code: "RECORD_IN_USE", message: "The record is currently in use and cannot be removed." });
          return;
        }
      }
      console.error("Resort management error:", error);
      res.status(500).json({ status: "error", code: "RESORT_MANAGEMENT_ERROR", message: "Unable to complete this resort request." });
    }
  };
}

export async function transaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      });
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) continue;
      throw error;
    }
  }
  throw new ResortApiError(409, "CONCURRENT_UPDATE", "Please retry this request.");
}

export async function ownedProperty(req: AuthRequest) {
  const userId = req.user?.userId;
  if (!userId) throw new ResortApiError(401, "UNAUTHORIZED", "Please sign in.");
  const property = await prisma.resortProperty.findFirst({
    where: { id: String(req.params.propertyId || ""), owner: { userId } },
    select: { id: true, name: true, status: true, onboardingCompleted: true },
  });
  if (!property) throw new ResortApiError(404, "PROPERTY_NOT_FOUND", "Property not found.");
  return property;
}

export async function ownedEvent(req: AuthRequest, eventId: string) {
  const property = await ownedProperty(req);
  const event = await prisma.resortEvent.findFirst({
    where: { id: eventId, propertyId: property.id },
  });
  if (!event) throw new ResortApiError(404, "EVENT_NOT_FOUND", "Event or retreat not found.");
  return { property, event };
}

export function requiredText(v: unknown, name: string, maxLength = 500): string {
  if (typeof v !== "string" || !v.trim() || v.trim().length > maxLength) {
    throw new ResortApiError(422, "INVALID_FIELD", `${name} is required (maximum ${maxLength} characters).`);
  }
  return v.trim();
}

export function optionalText(v: unknown, name: string, maxLength = 10000): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || v.length > maxLength) {
    throw new ResortApiError(422, "INVALID_FIELD", `${name} must be text (maximum ${maxLength} characters).`);
  }
  return v.trim() || null;
}

export function wholeNumber(v: unknown, name: string, min: number, max: number): number {
  const n = Number(v);
  if (v === "" || v === null || v === undefined || !Number.isSafeInteger(n) || n < min || n > max) {
    throw new ResortApiError(422, "INVALID_FIELD", `${name} must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

const DAY = 86400000;
export function parseDate(v: unknown, name = "date"): Date {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new ResortApiError(422, "INVALID_DATE", `${name} must use YYYY-MM-DD format.`);
  }
  const d = new Date(`${v}T00:00:00.000Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw new ResortApiError(422, "INVALID_DATE", `${name} is not a valid calendar date.`);
  }
  return d;
}
export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY);

export function dateRange(from: Date, untilExclusive: Date, maxDays = 366): string[] {
  const days = Math.round((untilExclusive.getTime() - from.getTime()) / DAY);
  if (days < 1 || days > maxDays) {
    throw new ResortApiError(422, "INVALID_DATE_RANGE", `Date range must be between 1 and ${maxDays} days.`);
  }
  return Array.from({ length: days }, (_, i) => dayKey(addDays(from, i)));
}

export function parseDateTime(v: unknown, name: string): Date {
  // Require an explicit UTC offset to avoid server-local timezone ambiguity.
  if (typeof v !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(v)) {
    throw new ResortApiError(422, "INVALID_DATETIME", `${name} needs an ISO timestamp with Z or UTC offset.`);
  }
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) {
    throw new ResortApiError(422, "INVALID_DATETIME", `${name} is invalid.`);
  }
  return d;
}

export function validTimeZone(v: unknown): string {
  const value = requiredText(v, "timeZone", 100);
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date()); }
  catch { throw new ResortApiError(422, "INVALID_TIMEZONE", "Enter a valid IANA time zone such as Asia/Kolkata."); }
  return value;
}

export function localDate(dateTime: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(dateTime);
  const pick = (type: string) => parts.find(p => p.type === type)?.value || "";
  return parseDate(`${pick("year")}-${pick("month")}-${pick("day")}`, "local date");
}

export function eventNights(startAt: Date, endAt: Date, timeZone: string) {
  const start = localDate(startAt, timeZone);
  const last = localDate(endAt, timeZone);
  // A same-day programme with accommodation occupies at least that night.
  const endExclusive = last.getTime() > start.getTime() ? last : addDays(start, 1);
  dateRange(start, endExclusive);
  return { start, endExclusive };
}

export function bookingRef(): string {
  return `AN-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export const activeReservations = [
  ResortReservationStatus.EXPECTED,
  ResortReservationStatus.IN_HOUSE,
  ResortReservationStatus.DEPARTED,
];

export async function roomTypeFor(tx: Tx, propertyId: string, roomTypeId: string) {
  const type = await tx.resortRoomType.findFirst({
    where: { id: roomTypeId, propertyId },
    select: { id: true, name: true, quantity: true, maxAdults: true, maxChildren: true },
  });
  if (!type) throw new ResortApiError(404, "ROOM_TYPE_NOT_FOUND", "Room type does not belong to this property.");
  return type;
}

export async function roomUnitFor(tx: Tx, propertyId: string, roomTypeId: string, roomUnitId: string) {
  const unit = await tx.resortRoomUnit.findFirst({
    where: { id: roomUnitId, propertyId, roomTypeId },
    select: { id: true, number: true, roomTypeId: true },
  });
  if (!unit) throw new ResortApiError(404, "ROOM_UNIT_NOT_FOUND", "Room number does not belong to this room type.");
  return unit;
}

export function overlap(start: Date, end: Date, from: Date, until: Date) {
  return start.getTime() < until.getTime() && end.getTime() > from.getTime();
}

async function busyIntervals(tx: Tx, roomTypeId: string, from: Date, until: Date, ignoreReservationId?: string) {
  const [reservations, blocks, holds] = await Promise.all([
    tx.resortReservation.findMany({
      where: {
        roomTypeId,
        status: { in: activeReservations },
        checkInDate: { lt: until }, checkOutDate: { gt: from },
        ...(ignoreReservationId ? { id: { not: ignoreReservationId } } : {}),
      },
      select: { id: true, roomUnitId: true, checkInDate: true, checkOutDate: true },
    }),
    tx.resortRoomBlock.findMany({
      where: { roomUnit: { roomTypeId }, startDate: { lt: until }, endDateExclusive: { gt: from } },
      select: { roomUnitId: true, startDate: true, endDateExclusive: true },
    }),
    tx.resortEventRoomHold.findMany({
      where: { roomUnit: { roomTypeId }, startDate: { lt: until }, endDateExclusive: { gt: from } },
      select: { roomUnitId: true, startDate: true, endDateExclusive: true },
    }),
  ]);
  return { reservations, blocks, holds };
}

export async function ensureAvailable(
  tx: Tx,
  args: {
    propertyId: string; roomTypeId: string; from: Date; until: Date;
    roomUnitId?: string | null; addCount?: number; ignoreReservationId?: string;
  },
) {
  const type = await roomTypeFor(tx, args.propertyId, args.roomTypeId);
  const days = dateRange(args.from, args.until);
  const busy = await busyIntervals(tx, type.id, args.from, args.until, args.ignoreReservationId);
  // Only physically numbered rooms can be promised to guests or retreats.
  // This prevents bookings from consuming inventory that cannot be assigned at check-in.
  const registeredUnits = await tx.resortRoomUnit.count({ where: { propertyId: args.propertyId, roomTypeId: type.id } });
  const effectiveCapacity = Math.min(type.quantity, registeredUnits);
  const add = args.addCount ?? 1;
  for (const day of days) {
    const d = parseDate(day);
    const next = addDays(d, 1);
    const count =
      busy.reservations.filter(r => overlap(r.checkInDate, r.checkOutDate, d, next)).length +
      busy.blocks.filter(b => overlap(b.startDate, b.endDateExclusive, d, next)).length +
      busy.holds.filter(h => overlap(h.startDate, h.endDateExclusive, d, next)).length;
    if (count + add > effectiveCapacity) {
      throw new ResortApiError(409, "ROOM_TYPE_FULL", `No numbered ${type.name} rooms are available on ${day}. Assign any missing room numbers first.`);
    }
  }
  if (args.roomUnitId) {
    await roomUnitFor(tx, args.propertyId, type.id, args.roomUnitId);
    const used = busy.reservations.some(r => r.roomUnitId === args.roomUnitId) ||
      busy.blocks.some(b => b.roomUnitId === args.roomUnitId) ||
      busy.holds.some(h => h.roomUnitId === args.roomUnitId);
    if (used) throw new ResortApiError(409, "ROOM_UNAVAILABLE", "This specific room is booked, blocked or reserved for an event.");
  }
}

export async function ensureUnitFree(
  tx: Tx, propertyId: string, roomTypeId: string, roomUnitId: string,
  from: Date, until: Date, ignoreReservationId?: string,
) {
  await roomUnitFor(tx, propertyId, roomTypeId, roomUnitId);
  const busy = await busyIntervals(tx, roomTypeId, from, until, ignoreReservationId);
  if (
    busy.reservations.some(r => r.roomUnitId === roomUnitId) ||
    busy.blocks.some(b => b.roomUnitId === roomUnitId) ||
    busy.holds.some(h => h.roomUnitId === roomUnitId)
  ) throw new ResortApiError(409, "ROOM_UNAVAILABLE", "This room is already booked, blocked or reserved for a retreat.");
}

export function isPublished(status: ResortPropertyStatus) {
  return status === ResortPropertyStatus.PUBLISHED;
}
