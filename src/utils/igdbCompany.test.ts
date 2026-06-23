import { describe, expect, test, vi } from "vitest";
import { formatIgdbCompanySize, formatIgdbCountryCode, listIgdbCountryOptions } from "./igdbCompany";

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

describe("listIgdbCountryOptions", () => {
  test("returns localized country options sorted by label", () => {
    const options = listIgdbCountryOptions("it");
    const italy = options.find((option) => option.code === 380);
    const japan = options.find((option) => option.code === 392);

    expect(italy?.label).toBe("Italia");
    expect(japan?.label).toBe("Giappone");
    expect(options[0].label.localeCompare(options[1].label, "it", { sensitivity: "base" })).toBeLessThanOrEqual(
      0
    );
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
