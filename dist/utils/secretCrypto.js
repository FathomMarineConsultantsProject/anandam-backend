"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptSecret = exports.encryptSecret = void 0;
const crypto_1 = __importDefault(require("crypto"));
// ======================================================
// ENCRYPTION KEY
// ======================================================
const getEncryptionKey = () => {
    const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "";
    if (!/^[a-fA-F0-9]{64}$/.test(key)) {
        throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters");
    }
    return Buffer.from(key, "hex");
};
// ======================================================
// ENCRYPT
// ======================================================
const encryptSecret = (plainText) => {
    const key = getEncryptionKey();
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
        iv.toString("hex"),
        authTag.toString("hex"),
        encrypted.toString("hex"),
    ].join(".");
};
exports.encryptSecret = encryptSecret;
// ======================================================
// DECRYPT
// ======================================================
const decryptSecret = (encryptedValue) => {
    const [ivHex, tagHex, encryptedHex,] = encryptedValue.split(".");
    if (!ivHex ||
        !tagHex ||
        !encryptedHex) {
        throw new Error("Invalid encrypted secret");
    }
    const key = getEncryptionKey();
    const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
};
exports.decryptSecret = decryptSecret;
