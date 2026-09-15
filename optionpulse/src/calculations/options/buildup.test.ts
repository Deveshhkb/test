import { describe, expect, it } from "vitest";
import { detectBuildup } from "./buildup";

describe("detectBuildup", () => {
  it("classifies price up with OI up as a long buildup", () => {
    expect(detectBuildup(5, 1000).type).toBe("LONG_BUILDUP");
  });

  it("classifies price down with OI up as a short buildup", () => {
    expect(detectBuildup(-5, 1000).type).toBe("SHORT_BUILDUP");
  });

  it("classifies price up with OI down as short covering", () => {
    expect(detectBuildup(5, -1000).type).toBe("SHORT_COVERING");
  });

  it("classifies price down with OI down as long unwinding", () => {
    expect(detectBuildup(-5, -1000).type).toBe("LONG_UNWINDING");
  });

  it("returns neutral when either input is flat", () => {
    expect(detectBuildup(0, 1000).type).toBe("NEUTRAL");
    expect(detectBuildup(5, 0).type).toBe("NEUTRAL");
  });

  it("treats movement inside the epsilon band as flat", () => {
    expect(detectBuildup(0.4, 900, 1000).type).toBe("NEUTRAL");
    expect(detectBuildup(0.4, 1200, 1000).type).toBe("NEUTRAL");
  });

  it("carries a directional lean for each classification", () => {
    expect(detectBuildup(5, 1000).bias).toBe(1);
    expect(detectBuildup(-5, 1000).bias).toBe(-1);
    expect(detectBuildup(0, 0).bias).toBe(0);
  });
});
