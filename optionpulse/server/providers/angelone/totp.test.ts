import { describe, expect, it } from "vitest";
import { base32Decode, generateTotp, secondsUntilNextStep } from "./totp";

/** RFC 6238 Appendix B seed "12345678901234567890", base32-encoded. */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32Decode", () => {
  it("decodes the RFC 6238 seed back to its ASCII form", () => {
    expect(base32Decode(RFC_SECRET).toString("ascii")).toBe("12345678901234567890");
  });

  it("tolerates padding, spaces, hyphens and lower case", () => {
    const messy = "gezd gnbv-gy3t qojq gezd gnbv gy3t qojq==";
    expect(base32Decode(messy)).toEqual(base32Decode(RFC_SECRET));
  });

  it("rejects a secret containing characters outside the alphabet", () => {
    expect(() => base32Decode("ABC1!")).toThrow(/Invalid base32/);
  });
});

describe("generateTotp", () => {
  // RFC 6238 Appendix B, SHA-1 column, 8 digits.
  const vectors: Array<[number, string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];

  it.each(vectors)("matches the RFC vector at T=%i", (timestamp, expected) => {
    expect(generateTotp(RFC_SECRET, { timestamp, digits: 8 })).toBe(expected);
  });

  it("produces the six digits SmartAPI expects", () => {
    const code = generateTotp(RFC_SECRET, { timestamp: 59 });
    expect(code).toMatch(/^\d{6}$/);
    expect(code).toBe("287082"); // last six digits of the RFC vector
  });

  it("is stable within a step and changes across one", () => {
    // 1_700_000_010 is a step boundary: ...000 and ...009 share a counter.
    const a = generateTotp(RFC_SECRET, { timestamp: 1_700_000_000 });
    const b = generateTotp(RFC_SECRET, { timestamp: 1_700_000_009 });
    const c = generateTotp(RFC_SECRET, { timestamp: 1_700_000_010 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("pads a short code to the full width", () => {
    expect(generateTotp(RFC_SECRET, { timestamp: 1111111109, digits: 8 })).toBe("07081804");
  });
});

describe("secondsUntilNextStep", () => {
  it("counts down within the step window", () => {
    expect(secondsUntilNextStep(1_700_000_000)).toBe(10);
    expect(secondsUntilNextStep(1_700_000_009)).toBe(1);
    expect(secondsUntilNextStep(1_700_000_010)).toBe(30);
  });
});
