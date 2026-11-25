import { randomBytes } from "crypto";
import { head, del, issueSignedToken, presignUrl } from "@vercel/blob";
import { ResortEventImageKind, ResortEventStatus } from "@prisma/client";
import { guarded, ownedEvent, prisma, transaction, ResortApiError } from "../services/resortManagement.service";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
function credentials() {
  const token = process.env.RESORT_IMAGE_BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = process.env.RESORT_IMAGE_BLOB_STORE_ID?.trim();
  if (!token || !storeId) {
    throw new ResortApiError(500, "IMAGE_STORE_MISSING", "The resort image store is not configured.");
  }
  return { token, storeId };
}
function kind(v: unknown): ResortEventImageKind {
  const result = String(v || "").toUpperCase();
  if (result !== "COVER" && result !== "GALLERY") {
    throw new ResortApiError(422, "INVALID_IMAGE_KIND", "kind must be COVER or GALLERY.");
  }
  return result as ResortEventImageKind;
}
function cleanFileName(v: unknown) {
  return String(v || "image").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "image";
}
function prefix(propertyId: string, eventId: string, imageKind: ResortEventImageKind) {
  return `resort-events/${propertyId}/${eventId}/${imageKind.toLowerCase()}/`;
}

// POST /api/resort-owner/properties/:propertyId/events/:eventId/images/presign
export const presignEventImage = guarded(async (req, res) => {
  const { property, event } = await ownedEvent(req, String(req.params.eventId));
  const imageKind = kind(req.body?.kind);
  const contentType = String(req.body?.contentType || "").toLowerCase();
  const sizeBytes = Number(req.body?.sizeBytes);
  if (!ALLOWED.has(contentType)) throw new ResortApiError(415, "UNSUPPORTED_IMAGE", "Use JPG, PNG or WebP.");
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) {
    throw new ResortApiError(413, "IMAGE_TOO_LARGE", "Maximum image size is 5 MB.");
  }
  const { token, storeId } = credentials();
  const pathname = `${prefix(property.id, event.id, imageKind)}${randomBytes(12).toString("hex")}-${cleanFileName(req.body?.fileName)}`;
  const validUntil = Date.now() + 15 * 60 * 1000;
  const signed = await issueSignedToken({ token, storeId, pathname, operations: ["put"], validUntil,
    allowedContentTypes: [contentType], maximumSizeInBytes: MAX_SIZE });
  const { presignedUrl } = await presignUrl(signed, {
    access: "public", operation: "put", pathname, validUntil,
    allowedContentTypes: [contentType], maximumSizeInBytes: MAX_SIZE, allowOverwrite: false,
  });
  res.json({ uploadUrl: presignedUrl, method: "PUT", pathname, kind: imageKind,
    contentType, maximumSizeInBytes: MAX_SIZE, expiresAt: new Date(validUntil).toISOString() });
});

// POST /api/resort-owner/properties/:propertyId/events/:eventId/images/confirm
export const confirmEventImage = guarded(async (req, res) => {
  const { property, event } = await ownedEvent(req, String(req.params.eventId));
  const imageKind = kind(req.body?.kind);
  const pathname = String(req.body?.pathname || "");
  const expected = prefix(property.id, event.id, imageKind);
  const basename = pathname.startsWith(expected) ? pathname.slice(expected.length) : "";
  if (!/^[0-9a-f]{24}-[a-zA-Z0-9._-]{1,120}$/.test(basename)) {
    throw new ResortApiError(403, "IMAGE_PATH_INVALID", "Image does not belong to this event and kind.");
  }
  const previous = await prisma.resortEventImage.findUnique({ where: { pathname } });
  if (previous) {
    if (previous.eventId !== event.id || previous.kind !== imageKind) {
      throw new ResortApiError(409, "IMAGE_ALREADY_USED", "This image is registered to another event.");
    }
    return void res.json({ image: previous, alreadyConfirmed: true });
  }
  const { token, storeId } = credentials();
  const metadata = await head(pathname, { token, storeId });
  if (metadata.size < 1 || metadata.size > MAX_SIZE || !ALLOWED.has(metadata.contentType)) {
    throw new ResortApiError(422, "IMAGE_INVALID", "Uploaded image content or size is invalid.");
  }
  const sortOrder = req.body?.sortOrder === undefined ? 0 : Number(req.body.sortOrder);
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
    throw new ResortApiError(422, "INVALID_SORT_ORDER", "sortOrder must be a non-negative integer.");
  }
  const { image, replaced } = await transaction(async tx => {
    const replaced = imageKind === "COVER" ? await tx.resortEventImage.findMany({
      where: { eventId: event.id, kind: ResortEventImageKind.COVER },
      select: { id: true, pathname: true },
    }) : [];
    if (replaced.length) await tx.resortEventImage.deleteMany({ where: { id: { in: replaced.map(i => i.id) } } });
    if (imageKind === "GALLERY") {
      const count = await tx.resortEventImage.count({ where: { eventId: event.id, kind: "GALLERY" } });
      if (count >= 12) throw new ResortApiError(422, "GALLERY_LIMIT", "A retreat can have up to 12 gallery photos.");
    }
    const image = await tx.resortEventImage.create({ data: {
      eventId: event.id, kind: imageKind, url: metadata.url, pathname: metadata.pathname,
      contentType: metadata.contentType, sizeBytes: metadata.size, sortOrder,
    } });
    return { image, replaced };
  });
  for (const old of replaced) {
    if (old.pathname !== image.pathname) await del(old.pathname, { token, storeId }).catch(console.error);
  }
  res.status(201).json({ image });
});

// DELETE /api/resort-owner/properties/:propertyId/events/:eventId/images/:imageId
export const deleteEventImage = guarded(async (req, res) => {
  const { event } = await ownedEvent(req, String(req.params.eventId));
  const image = await prisma.resortEventImage.findFirst({ where: { id: String(req.params.imageId), eventId: event.id } });
  if (!image) throw new ResortApiError(404, "IMAGE_NOT_FOUND", "Event image not found.");
  if (image.kind === ResortEventImageKind.COVER && event.status === ResortEventStatus.PUBLISHED) {
    throw new ResortApiError(409, "PUBLISHED_COVER_REQUIRED", "Replace the cover photo before deleting the previous cover of a published retreat.");
  }
  const { token, storeId } = credentials();
  await prisma.resortEventImage.delete({ where: { id: image.id } });
  await del(image.pathname, { token, storeId }).catch(error => console.error("Event image cleanup failed:", error));
  res.json({ message: "Image deleted." });
});
