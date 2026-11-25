"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEventImage = exports.confirmEventImage = exports.presignEventImage = void 0;
const crypto_1 = require("crypto");
const blob_1 = require("@vercel/blob");
const client_1 = require("@prisma/client");
const resortManagement_service_1 = require("../services/resortManagement.service");
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
function credentials() {
    const token = process.env.RESORT_IMAGE_BLOB_READ_WRITE_TOKEN?.trim();
    const storeId = process.env.RESORT_IMAGE_BLOB_STORE_ID?.trim();
    if (!token || !storeId) {
        throw new resortManagement_service_1.ResortApiError(500, "IMAGE_STORE_MISSING", "The resort image store is not configured.");
    }
    return { token, storeId };
}
function kind(v) {
    const result = String(v || "").toUpperCase();
    if (result !== "COVER" && result !== "GALLERY") {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_IMAGE_KIND", "kind must be COVER or GALLERY.");
    }
    return result;
}
function cleanFileName(v) {
    return String(v || "image").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "image";
}
function prefix(propertyId, eventId, imageKind) {
    return `resort-events/${propertyId}/${eventId}/${imageKind.toLowerCase()}/`;
}
// POST /api/resort-owner/properties/:propertyId/events/:eventId/images/presign
exports.presignEventImage = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { property, event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    const imageKind = kind(req.body?.kind);
    const contentType = String(req.body?.contentType || "").toLowerCase();
    const sizeBytes = Number(req.body?.sizeBytes);
    if (!ALLOWED.has(contentType))
        throw new resortManagement_service_1.ResortApiError(415, "UNSUPPORTED_IMAGE", "Use JPG, PNG or WebP.");
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) {
        throw new resortManagement_service_1.ResortApiError(413, "IMAGE_TOO_LARGE", "Maximum image size is 5 MB.");
    }
    const { token, storeId } = credentials();
    const pathname = `${prefix(property.id, event.id, imageKind)}${(0, crypto_1.randomBytes)(12).toString("hex")}-${cleanFileName(req.body?.fileName)}`;
    const validUntil = Date.now() + 15 * 60 * 1000;
    const signed = await (0, blob_1.issueSignedToken)({ token, storeId, pathname, operations: ["put"], validUntil,
        allowedContentTypes: [contentType], maximumSizeInBytes: MAX_SIZE });
    const { presignedUrl } = await (0, blob_1.presignUrl)(signed, {
        access: "public", operation: "put", pathname, validUntil,
        allowedContentTypes: [contentType], maximumSizeInBytes: MAX_SIZE, allowOverwrite: false,
    });
    res.json({ uploadUrl: presignedUrl, method: "PUT", pathname, kind: imageKind,
        contentType, maximumSizeInBytes: MAX_SIZE, expiresAt: new Date(validUntil).toISOString() });
});
// POST /api/resort-owner/properties/:propertyId/events/:eventId/images/confirm
exports.confirmEventImage = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { property, event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    const imageKind = kind(req.body?.kind);
    const pathname = String(req.body?.pathname || "");
    const expected = prefix(property.id, event.id, imageKind);
    const basename = pathname.startsWith(expected) ? pathname.slice(expected.length) : "";
    if (!/^[0-9a-f]{24}-[a-zA-Z0-9._-]{1,120}$/.test(basename)) {
        throw new resortManagement_service_1.ResortApiError(403, "IMAGE_PATH_INVALID", "Image does not belong to this event and kind.");
    }
    const previous = await resortManagement_service_1.prisma.resortEventImage.findUnique({ where: { pathname } });
    if (previous) {
        if (previous.eventId !== event.id || previous.kind !== imageKind) {
            throw new resortManagement_service_1.ResortApiError(409, "IMAGE_ALREADY_USED", "This image is registered to another event.");
        }
        return void res.json({ image: previous, alreadyConfirmed: true });
    }
    const { token, storeId } = credentials();
    const metadata = await (0, blob_1.head)(pathname, { token, storeId });
    if (metadata.size < 1 || metadata.size > MAX_SIZE || !ALLOWED.has(metadata.contentType)) {
        throw new resortManagement_service_1.ResortApiError(422, "IMAGE_INVALID", "Uploaded image content or size is invalid.");
    }
    const sortOrder = req.body?.sortOrder === undefined ? 0 : Number(req.body.sortOrder);
    if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
        throw new resortManagement_service_1.ResortApiError(422, "INVALID_SORT_ORDER", "sortOrder must be a non-negative integer.");
    }
    const { image, replaced } = await (0, resortManagement_service_1.transaction)(async (tx) => {
        const replaced = imageKind === "COVER" ? await tx.resortEventImage.findMany({
            where: { eventId: event.id, kind: client_1.ResortEventImageKind.COVER },
            select: { id: true, pathname: true },
        }) : [];
        if (replaced.length)
            await tx.resortEventImage.deleteMany({ where: { id: { in: replaced.map(i => i.id) } } });
        if (imageKind === "GALLERY") {
            const count = await tx.resortEventImage.count({ where: { eventId: event.id, kind: "GALLERY" } });
            if (count >= 12)
                throw new resortManagement_service_1.ResortApiError(422, "GALLERY_LIMIT", "A retreat can have up to 12 gallery photos.");
        }
        const image = await tx.resortEventImage.create({ data: {
                eventId: event.id, kind: imageKind, url: metadata.url, pathname: metadata.pathname,
                contentType: metadata.contentType, sizeBytes: metadata.size, sortOrder,
            } });
        return { image, replaced };
    });
    for (const old of replaced) {
        if (old.pathname !== image.pathname)
            await (0, blob_1.del)(old.pathname, { token, storeId }).catch(console.error);
    }
    res.status(201).json({ image });
});
// DELETE /api/resort-owner/properties/:propertyId/events/:eventId/images/:imageId
exports.deleteEventImage = (0, resortManagement_service_1.guarded)(async (req, res) => {
    const { event } = await (0, resortManagement_service_1.ownedEvent)(req, String(req.params.eventId));
    const image = await resortManagement_service_1.prisma.resortEventImage.findFirst({ where: { id: String(req.params.imageId), eventId: event.id } });
    if (!image)
        throw new resortManagement_service_1.ResortApiError(404, "IMAGE_NOT_FOUND", "Event image not found.");
    if (image.kind === client_1.ResortEventImageKind.COVER && event.status === client_1.ResortEventStatus.PUBLISHED) {
        throw new resortManagement_service_1.ResortApiError(409, "PUBLISHED_COVER_REQUIRED", "Replace the cover photo before deleting the previous cover of a published retreat.");
    }
    const { token, storeId } = credentials();
    await resortManagement_service_1.prisma.resortEventImage.delete({ where: { id: image.id } });
    await (0, blob_1.del)(image.pathname, { token, storeId }).catch(error => console.error("Event image cleanup failed:", error));
    res.json({ message: "Image deleted." });
});
