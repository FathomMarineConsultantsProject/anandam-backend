"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteResortImage = exports.confirmResortImage = exports.presignResortImage = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const blob_1 = require("@vercel/blob");
const prisma = new client_1.PrismaClient();
const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const KINDS = new Set(["PROFILE", "COVER", "PROPERTY", "ROOM"]);
// Resort images must NEVER fall back to the practitioner / default Blob store.
const resortCredentials = () => {
    const storeId = process.env.RESORT_IMAGE_BLOB_STORE_ID?.trim();
    const token = process.env.RESORT_IMAGE_BLOB_READ_WRITE_TOKEN?.trim();
    if (!storeId || !token)
        return null;
    return { storeId, token };
};
const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "image";
const handler = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    }
    catch (error) {
        console.error("Resort image error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Image operation failed" });
        }
    }
};
const propertyFor = (req) => prisma.resortProperty.findFirst({
    where: {
        id: String(req.params.propertyId || ""),
        owner: { userId: req.user?.userId || "" },
    },
});
const imageKind = (value) => {
    const kind = String(value || "").toUpperCase();
    return KINDS.has(kind) ? kind : null;
};
const roomFor = (propertyId, roomTypeId) => prisma.resortRoomType.findFirst({
    where: { id: roomTypeId, propertyId },
    select: { id: true },
});
// POST /api/resort-owner/properties/:propertyId/images/presign
exports.presignResortImage = handler(async (req, res) => {
    const property = await propertyFor(req);
    if (!property) {
        return void res.status(404).json({ message: "Property not found" });
    }
    const kind = imageKind(req.body?.kind);
    if (!kind) {
        return void res.status(400).json({ message: "Invalid image kind" });
    }
    const roomTypeId = kind === "ROOM" ? String(req.body?.roomTypeId || "") : null;
    if (kind === "ROOM" && !(await roomFor(property.id, roomTypeId))) {
        return void res.status(404).json({ message: "Room not found" });
    }
    const contentType = String(req.body?.contentType || "").toLowerCase();
    const sizeBytes = Number(req.body?.sizeBytes);
    if (!TYPES.has(contentType)) {
        return void res.status(415).json({
            message: "Only JPG, PNG or WebP images are supported",
        });
    }
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_SIZE) {
        return void res.status(413).json({ message: "Image must be 5 MB or smaller" });
    }
    const credentials = resortCredentials();
    if (!credentials) {
        return void res.status(500).json({
            message: "Set RESORT_IMAGE_BLOB_STORE_ID and RESORT_IMAGE_BLOB_READ_WRITE_TOKEN in the backend environment",
        });
    }
    const pathname = [
        "resorts",
        property.id,
        kind.toLowerCase(),
        roomTypeId || "property",
        `${(0, crypto_1.randomBytes)(12).toString("hex")}-${safeName(String(req.body?.fileName || "image"))}`,
    ].join("/");
    const validUntil = Date.now() + 15 * 60 * 1000;
    // The signing call explicitly authenticates against the resort-only store.
    const signedToken = await (0, blob_1.issueSignedToken)({
        storeId: credentials.storeId,
        token: credentials.token,
        pathname,
        operations: ["put"],
        validUntil,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: MAX_SIZE,
    });
    const { presignedUrl } = await (0, blob_1.presignUrl)(signedToken, {
        access: "public",
        operation: "put",
        pathname,
        validUntil,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: MAX_SIZE,
        allowOverwrite: false,
    });
    return void res.status(200).json({
        uploadUrl: presignedUrl,
        method: "PUT",
        pathname,
        kind,
        roomTypeId,
        contentType,
        expiresAt: new Date(validUntil).toISOString(),
        maximumSizeInBytes: MAX_SIZE,
    });
});
// POST /api/resort-owner/properties/:propertyId/images/confirm
exports.confirmResortImage = handler(async (req, res) => {
    const property = await propertyFor(req);
    if (!property) {
        return void res.status(404).json({ message: "Property not found" });
    }
    const kind = imageKind(req.body?.kind);
    if (!kind) {
        return void res.status(400).json({ message: "Invalid image kind" });
    }
    const roomTypeId = kind === "ROOM" ? String(req.body?.roomTypeId || "") : null;
    if (kind === "ROOM" && !(await roomFor(property.id, roomTypeId))) {
        return void res.status(404).json({ message: "Room not found" });
    }
    const pathname = String(req.body?.pathname || "");
    const parts = pathname.split("/");
    if (parts.length !== 5 ||
        parts[0] !== "resorts" ||
        parts[1] !== property.id ||
        parts[2] !== kind.toLowerCase() ||
        parts[3] !== (roomTypeId || "property") ||
        !/^[0-9a-f]{24}-[a-zA-Z0-9._-]{1,120}$/.test(parts[4])) {
        return void res.status(403).json({
            message: "Image path does not match this property",
        });
    }
    const credentials = resortCredentials();
    if (!credentials) {
        return void res.status(500).json({ message: "Resort Blob credentials are not configured" });
    }
    // Return an existing record rather than replacing it on duplicate confirmations.
    const existing = await prisma.resortImage.findUnique({ where: { pathname } });
    if (existing) {
        if (existing.propertyId !== property.id ||
            existing.kind !== kind ||
            existing.roomTypeId !== roomTypeId) {
            return void res.status(409).json({ message: "Image is already registered differently" });
        }
        return void res.status(200).json({ image: existing, alreadyConfirmed: true });
    }
    const metadata = await (0, blob_1.head)(pathname, {
        storeId: credentials.storeId,
        token: credentials.token,
    });
    if (metadata.size < 1 || metadata.size > MAX_SIZE || !TYPES.has(metadata.contentType)) {
        return void res.status(400).json({ message: "Invalid uploaded image" });
    }
    const sortOrder = Number.isSafeInteger(req.body?.sortOrder) && req.body.sortOrder >= 0
        ? req.body.sortOrder
        : 0;
    // Replacing cover/profile updates the DB first and only then removes old files.
    const { image, replaced } = await prisma.$transaction(async (tx) => {
        const replaced = kind === "COVER" || kind === "PROFILE"
            ? await tx.resortImage.findMany({
                where: { propertyId: property.id, kind },
                select: { id: true, pathname: true },
            })
            : [];
        if (replaced.length) {
            await tx.resortImage.deleteMany({
                where: { id: { in: replaced.map((item) => item.id) } },
            });
        }
        const image = await tx.resortImage.create({
            data: {
                propertyId: property.id,
                roomTypeId,
                kind,
                url: metadata.url,
                pathname: metadata.pathname,
                contentType: metadata.contentType,
                sizeBytes: metadata.size,
                sortOrder,
            },
        });
        return { image, replaced };
    });
    // Blob cleanup should not roll back an already successful DB confirmation.
    for (const oldImage of replaced) {
        if (oldImage.pathname === image.pathname)
            continue;
        try {
            await (0, blob_1.del)(oldImage.pathname, {
                storeId: credentials.storeId,
                token: credentials.token,
            });
        }
        catch (error) {
            console.error("Old resort Blob cleanup failed:", error);
        }
    }
    return void res.status(201).json({ image });
});
// DELETE /api/resort-owner/properties/:propertyId/images/:imageId
exports.deleteResortImage = handler(async (req, res) => {
    const property = await propertyFor(req);
    if (!property) {
        return void res.status(404).json({ message: "Property not found" });
    }
    const image = await prisma.resortImage.findFirst({
        where: { id: String(req.params.imageId || ""), propertyId: property.id },
    });
    if (!image) {
        return void res.status(404).json({ message: "Image not found" });
    }
    const credentials = resortCredentials();
    if (!credentials) {
        return void res.status(500).json({ message: "Resort Blob credentials are not configured" });
    }
    await prisma.resortImage.delete({ where: { id: image.id } });
    try {
        await (0, blob_1.del)(image.pathname, {
            storeId: credentials.storeId,
            token: credentials.token,
        });
    }
    catch (error) {
        console.error("Resort Blob cleanup failed:", error);
    }
    return void res.status(200).json({ message: "Image deleted" });
});
