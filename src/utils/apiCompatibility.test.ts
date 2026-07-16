import { describe, expect, it } from "vitest";
import {
  isServerVersionCompatible,
  parseServerVersionPayload,
  WEB_REQUIRES_MIN_SERVER_VERSION,
} from "./apiCompatibility";

describe("apiCompatibility", () => {
  it("parses /version payload", () => {
    expect(parseServerVersionPayload({ version: "1.2.3" })).toEqual({
      version: "1.2.3",
    });
    expect(parseServerVersionPayload({})).toEqual({ version: null });
  });

  it("checks server semver against minimum required", () => {
    expect(isServerVersionCompatible("1.2.0", "1.2.0")).toBe(true);
    expect(isServerVersionCompatible("1.3.0", "1.2.0")).toBe(true);
    expect(isServerVersionCompatible("1.1.9", "1.2.0")).toBe(false);
    expect(isServerVersionCompatible(null, "1.2.0")).toBe(false);
    expect(WEB_REQUIRES_MIN_SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
