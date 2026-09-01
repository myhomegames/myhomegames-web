import { afterEach, describe, expect, it } from "vitest";
import {
  resolveDetailBackdropAmbientFill,
  resolveDetailBackdropVariant,
} from "./detailBackdropTvAmbient";

describe("detailBackdropTvAmbient", () => {
  afterEach(() => {
    delete document.documentElement.dataset.mhgTv;
  });

  it("disables ambient fill on TV when the skin flag is off", () => {
    document.documentElement.dataset.mhgTv = "1";
    expect(resolveDetailBackdropAmbientFill(false)).toBe(false);
    expect(resolveDetailBackdropAmbientFill(true)).toBe(true);
  });

  it("uses wide layout on TV when ambient is off", () => {
    document.documentElement.dataset.mhgTv = "1";
    expect(resolveDetailBackdropVariant(false)).toBe("wide");
    expect(resolveDetailBackdropVariant(true)).toBe("tv");
  });
});
