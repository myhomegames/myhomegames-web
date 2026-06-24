import { describe, expect, it } from "vitest";
import {
  companyProfileFormStatesEqual,
  companyProfileToFormState,
  formStateToCompanyProfile,
} from "./editCompanyProfile";

describe("editCompanyProfile", () => {
  it("round-trips company profile fields through form state", () => {
    const info = {
      status: "Active",
      countryCode: 392,
      started: "1979-05-30",
      legalName: "Capcom Co., Ltd.",
      companySizeId: 7,
      formerly: { id: 41283, name: "Flagship" },
      parentCompany: { id: 99, name: "Mattel" },
    };

    const form = companyProfileToFormState(info);
    expect(form.status).toBe("active");
    expect(form.countryCode).toBe("392");
    expect(form.startedYear).toBe("1979");
    expect(form.startedMonth).toBe("5");
    expect(form.startedDay).toBe("30");
    expect(form.legalName).toBe("Capcom Co., Ltd.");
    expect(form.companySizeId).toBe("7");
    expect(form.formerlyId).toBe("41283");
    expect(form.formerlyName).toBe("Flagship");
    expect(form.parentCompanyId).toBe("99");
    expect(form.parentCompanyName).toBe("Mattel");

    expect(formStateToCompanyProfile(form)).toEqual({
      status: "active",
      countryCode: 392,
      started: "1979-05-30",
      legalName: "Capcom Co., Ltd.",
      companySizeId: 7,
      formerly: { id: 41283, name: "Flagship" },
      parentCompany: { id: 99, name: "Mattel" },
    });
  });

  it("normalizes merged catalog status to merge for the edit combo", () => {
    const form = companyProfileToFormState({ status: "merged" });
    expect(form.status).toBe("merge");
  });

  it("detects form state changes", () => {
    const initial = companyProfileToFormState({ knownAs: "Capcom USA" });
    const changed = { ...initial, legalName: "Capcom Co., Ltd." };
    expect(companyProfileFormStatesEqual(initial, changed)).toBe(false);
    expect(companyProfileFormStatesEqual(initial, { ...initial })).toBe(true);
  });
});
