import { describe, expect, test, vi } from "vitest";
import { formatIgdbCompanySize, formatIgdbCountryCode } from "./igdbCompany";

describe("formatIgdbCountryCode", () => {
  test("returns localized country name for Italy", () => {
    expect(formatIgdbCountryCode(380, "it")).toBe("Italia");
  });

  test("returns localized country name for Japan in English", () => {
    expect(formatIgdbCountryCode(392, "en")).toBe("Japan");
  });

  test("returns null when code is missing", () => {
    expect(formatIgdbCountryCode(undefined, "it")).toBeNull();
  });
});

describe("formatIgdbCompanySize", () => {
  const t = vi.fn((key: string) => {
    if (key === "igdbCompanySizes.7") return "1001-5000 dipendenti";
    return key;
  });

  test("uses igdbCompanySizes id", () => {
    expect(formatIgdbCompanySize(7, t)).toBe("1001-5000 dipendenti");
  });

  test("returns null when id is missing", () => {
    expect(formatIgdbCompanySize(undefined, t)).toBeNull();
  });
});
