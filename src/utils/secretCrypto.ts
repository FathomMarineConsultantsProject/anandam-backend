import crypto from "crypto";


// ======================================================
// ENCRYPTION KEY
// ======================================================

const getEncryptionKey = (): Buffer => {
  const key =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "";


  if (!/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters"
    );
  }


  return Buffer.from(
    key,
    "hex"
  );
};


// ======================================================
// ENCRYPT
// ======================================================

export const encryptSecret = (
  plainText: string
): string => {

  const key =
    getEncryptionKey();


  const iv =
    crypto.randomBytes(12);


  const cipher =
    crypto.createCipheriv(
      "aes-256-gcm",
      key,
      iv
    );


  const encrypted =
    Buffer.concat([
      cipher.update(
        plainText,
        "utf8"
      ),

      cipher.final(),
    ]);


  const authTag =
    cipher.getAuthTag();


  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
};


// ======================================================
// DECRYPT
// ======================================================

export const decryptSecret = (
  encryptedValue: string
): string => {

  const [
    ivHex,
    tagHex,
    encryptedHex,
  ] =
    encryptedValue.split(".");


  if (
    !ivHex ||
    !tagHex ||
    !encryptedHex
  ) {
    throw new Error(
      "Invalid encrypted secret"
    );
  }


  const key =
    getEncryptionKey();


  const decipher =
    crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(
        ivHex,
        "hex"
      )
    );


  decipher.setAuthTag(
    Buffer.from(
      tagHex,
      "hex"
    )
  );


  const decrypted =
    Buffer.concat([
      decipher.update(
        Buffer.from(
          encryptedHex,
          "hex"
        )
      ),

      decipher.final(),
    ]);


  return decrypted.toString(
    "utf8"
  );
};