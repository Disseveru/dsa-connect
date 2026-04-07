import crypto from "crypto";
import { getServerEnv } from "./env";

const ALGO = "aes-256-gcm";

function getKey() {
  const { EXECUTOR_ENCRYPTION_KEY } = getServerEnv();
  return crypto.createHash("sha256").update(EXECUTOR_ENCRYPTION_KEY).digest();
}

export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(cipherText: string): string {
  const [ivHex, tagHex, dataHex] = cipherText.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted payload format");
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
