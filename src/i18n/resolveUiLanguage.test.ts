import { afterEach, describe, expect, it, vi } from "vitest";
import {
  matchSupportedUiLanguage,
  normalizeUiLanguage,
  resolveInitialUiLanguage,
  resolveUiLanguageFromBrowser,
} from "./resolveUiLanguage";

describe("resolveUiLanguage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matchSupportedUiLanguage maps BCP-47 tags", () => {
    expect(matchSupportedUiLanguage("it-IT")).toBe("it");
    expect(matchSupportedUiLanguage("pt_BR")).toBe("pt");
    expect(matchSupportedUiLanguage("zh-CN")).toBe("zh");
    expect(matchSupportedUiLanguage("en")).toBe("en");
    expect(matchSupportedUiLanguage("sv-SE")).toBeNull();
    expect(matchSupportedUiLanguage("")).toBeNull();
  });

  it("normalizeUiLanguage falls back to en", () => {
    expect(normalizeUiLanguage("sv-SE")).toBe("en");
    expect(normalizeUiLanguage(undefined)).toBe("en");
  });

  it("resolveUiLanguageFromBrowser picks first supported tag", () => {
    expect(resolveUiLanguageFromBrowser(["sv-SE", "it-IT", "en-US"])).toBe("it");
    expect(resolveUiLanguageFromBrowser(["sv-SE", "nb-NO"])).toBe("en");
    expect(resolveUiLanguageFromBrowser([])).toBe("en");
  });

  it("resolveInitialUiLanguage prefers stored language over browser", () => {
    expect(resolveInitialUiLanguage("fr", ["it-IT"])).toBe("fr");
    expect(resolveInitialUiLanguage("sv", ["it-IT"])).toBe("it");
    expect(resolveInitialUiLanguage(null, ["de-DE"])).toBe("de");
    expect(resolveInitialUiLanguage("", ["ko-KR"])).toBe("en");
  });
});
