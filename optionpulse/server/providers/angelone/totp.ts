import { createHmac } from "node:crypto";

/**
 * RFC 6238 time-based one-time passwords.
 *
 * SmartAPI's login requires a fresh TOTP derived from the secret shown when
 * two-factor authentication is enabled on the Angel One account. Implemented
 * here rather than pulled in as a dependency: it is thirty lines, it is
 * verifiable against the RFC's own test vectors, and an authentication
 * primitive is not somewhere to add supply-chain surface.
 */

export interface TotpOptions {
  /** Unix time in seconds. Defaults to now. */
  timestamp?: number;
  /** Time step in seconds. RFC default, and Angel One's, is 30. */
  step?: number;
  digits?: number;
  algorithm?: "sha1" | "sha256" | "sha512";
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Decodes an RFC 4648 base32 secret, ignoring padding, spaces and case. */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[=\s-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character "${char}" in TOTP secret.`);
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

/** Eight-byte big-endian counter, as the HOTP spec requires. */
function counterBuffer(counter: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(Math.floor(counter)));
  return buffer;
}

export function generateTotp(secret: string, options: TotpOptions = {}): string {
  const step = options.step ?? 30;
  const digits = options.digits ?? 6;
  const algorithm = options.algorithm ?? "sha1";
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);

  const key = base32Decode(secret);
  if (key.length === 0) throw new Error("TOTP secret decoded to zero bytes.");

  const digest = createHmac(algorithm, key)
    .update(counterBuffer(timestamp / step))
    .digest();

  // Dynamic truncation (RFC 4226 section 5.3).
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

/** Seconds remaining in the current step - used to avoid logging in on a boundary. */
export function secondsUntilNextStep(timestamp = Date.now() / 1000, step = 30): number {
  return step - (Math.floor(timestamp) % step);
}
