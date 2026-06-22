import { describe, expect, test, vi } from "vitest";
import { formatIgdbCompanySize } from "./igdbCompany";

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
