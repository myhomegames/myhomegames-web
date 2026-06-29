import { describe, expect, it } from "vitest";
import i18n from "../i18n/config";

describe("i18n summary translation keys", () => {
  it("does not resolve dynamic game summary keys to UI labels", async () => {
    await i18n.changeLanguage("it");
    const key = "game.42.summary";
    const text = "This is a long English game summary.";
    const existing = i18n.t(key, { defaultValue: "$$$$MISSING$$$$" });
    const wouldUseLocale =
      existing !== "$$$$MISSING$$$$" && existing !== key && existing !== text;
    expect(wouldUseLocale).toBe(false);
  });
});
