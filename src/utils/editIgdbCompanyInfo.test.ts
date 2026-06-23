import { describe, expect, test } from "vitest";
import {
  buildIgdbCompanyDateString,
  formStateToIgdbCompanyInfo,
  igdbCompanyInfoFormStatesEqual,
  igdbCompanyInfoToFormState,
  parseIgdbCompanyDateString,
} from "./editIgdbCompanyInfo";

describe("parseIgdbCompanyDateString", () => {
  test("parses full, month-only, and year-only dates", () => {
    expect(parseIgdbCompanyDateString("1998-12-31")).toEqual({
      year: "1998",
      month: "12",
      day: "31",
    });
    expect(parseIgdbCompanyDateString("1980-06")).toEqual({
      year: "1980",
      month: "6",
      day: "",
    });
    expect(parseIgdbCompanyDateString("1996")).toEqual({
      year: "1996",
      month: "",
      day: "",
    });
  });
});

describe("buildIgdbCompanyDateString", () => {
  test("builds stored IGDB date strings", () => {
    expect(
      buildIgdbCompanyDateString({ year: "1998", month: "12", day: "31" })
    ).toBe("1998-12-31");
    expect(buildIgdbCompanyDateString({ year: "1980", month: "6", day: "" })).toBe("1980-06");
    expect(buildIgdbCompanyDateString({ year: "1996", month: "", day: "" })).toBe("1996");
  });
});

describe("editIgdbCompanyInfo", () => {
  test("round-trips IGDB company info through form state", () => {
    const info = {
      status: "Renamed",
      countryCode: 840,
      started: "1980-03-15",
      changedOn: "1996-12",
      knownAs: "Capcom USA",
      legalName: "Capcom U.S.A., Inc.",
      companySizeId: 4,
      formerly: { id: 13, name: "Mattel Media" },
      parentCompany: { id: 99, name: "Mattel" },
      updatedTo: { id: 2, name: "3D Realms" },
    };

    const form = igdbCompanyInfoToFormState(info);
    expect(form.startedYear).toBe("1980");
    expect(form.startedMonth).toBe("3");
    expect(form.startedDay).toBe("15");
    expect(form.changedOnYear).toBe("1996");
    expect(form.changedOnMonth).toBe("12");
    expect(formStateToIgdbCompanyInfo(form)).toEqual({
      status: "renamed",
      countryCode: 840,
      started: "1980-03-15",
      changedOn: "1996-12",
      knownAs: "Capcom USA",
      legalName: "Capcom U.S.A., Inc.",
      companySizeId: 4,
      formerly: { id: 13, name: "Mattel Media" },
      parentCompany: { id: 99, name: "Mattel" },
      updatedTo: { id: 2, name: "3D Realms" },
    });
  });

  test("detects form changes", () => {
    const initial = igdbCompanyInfoToFormState({ knownAs: "Capcom USA" });
    const changed = { ...initial, legalName: "Capcom U.S.A., Inc." };
    expect(igdbCompanyInfoFormStatesEqual(initial, changed)).toBe(false);
    expect(igdbCompanyInfoFormStatesEqual(initial, { ...initial })).toBe(true);
  });
});
