import { describe, expect, test, vi } from "vitest";
import { formatCompanySize, formatCountryCode, listCountryOptions } from "./companyFormat";

describe("formatCountryCode", () => {
  test("returns localized country name for Italy", () => {
    expect(formatCountryCode(380, "it")).toBe("Italia");
  });

  test("returns localized country name for Japan in English", () => {
    expect(formatCountryCode(392, "en")).toBe("Japan");
  });

  test("returns null when code is missing", () => {
    expect(formatCountryCode(undefined, "it")).toBeNull();
  });
});

describe("listCountryOptions", () => {
  test("returns localized country options sorted by label", () => {
    const options = listCountryOptions("it");
    const italy = options.find((option) => option.code === 380);
    const japan = options.find((option) => option.code === 392);

    expect(italy?.label).toBe("Italia");
    expect(japan?.label).toBe("Giappone");
    expect(options[0].label.localeCompare(options[1].label, "it", { sensitivity: "base" })).toBeLessThanOrEqual(
      0
    );
  });
});

describe("formatCompanySize", () => {
  const t = vi.fn((key: string) => {
    if (key === "companySizes.7") return "1001-5000 dipendenti";
    return key;
  });

  test("uses companySizes id", () => {
    expect(formatCompanySize(7, t as never)).toBe("1001-5000 dipendenti");
  });

  test("returns null when id is missing", () => {
    expect(formatCompanySize(undefined, t as never)).toBeNull();
  });
});
