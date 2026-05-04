import { createDecipheriv, createHash } from "node:crypto";

/**
 * 飞书事件订阅 Encrypt Key 策略：body.encrypt 为 Base64(IV16 + ciphertext)。
 * @see https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/encrypt-key-encryption-configuration-case
 */
export function decryptFeishuEncryptField(encryptKey: string, encryptBase64: string): string {
  const key = createHash("sha256").update(encryptKey, "utf8").digest();
  const buf = Buffer.from(encryptBase64, "base64");
  if (buf.length < 32) {
    throw new Error("encrypt payload too short");
  }
  const iv = buf.subarray(0, 16);
  const ciphertext = buf.subarray(16);
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  let text = decrypted.toString("utf-8");
  const n = text.indexOf("{");
  const m = text.lastIndexOf("}");
  if (n >= 0 && m > n) {
    text = text.slice(n, m + 1);
  }
  return text;
}
