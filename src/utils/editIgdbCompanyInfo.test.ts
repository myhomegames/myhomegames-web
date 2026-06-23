import { describe, expect, test } from "vitest";
import {
  formStateToIgdbCompanyInfo,
  igdbCompanyInfoFormStatesEqual,
  igdbCompanyInfoToFormState,
} from "./editIgdbCompanyInfo";

describe("editIgdbCompanyInfo", () => {
  test("round-trips IGDB company info through form state", () => {
    const info = {
      status: "Renamed",
      countryCode: 840,
      started: "1980",
      changedOn: "1996",
      knownAs: "Capcom USA",
      legalName: "Capcom U.S.A., Inc.",
      companySizeId: 4,
      formerly: { id: 13, name: "Mattel Media" },
      parentCompany: { id: 99, name: "Mattel" },
      updatedTo: { id: 2, name: "3D Realms" },
    };

    const form = igdbCompanyInfoToFormState(info);
    expect(formStateToIgdbCompanyInfo(form)).toEqual({
      status: "renamed",
      countryCode: 840,
      started: "1980",
      changedOn: "1996",
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
