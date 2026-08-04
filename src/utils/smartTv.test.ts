import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applySmartTvDocumentFlag,
  isMhgTvSessionForced,
  isSmartTvBrowser,
  MHG_TV_SESSION_KEY,
  MOONLIGHT_TV_PROFILE,
  searchWithMhgTvPreserved,
  syncMhgTvSessionFromUrl,
  withMoonlightTvProfile,
} from "./smartTv";

describe("smartTv", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("detects Samsung Tizen and LG webOS", () => {
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 Chrome/85.0.4183.93 Safari/537.36",
      ),
    ).toBe(true);
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/108.0.0.0 Safari/537.36",
      ),
    ).toBe(true);
  });

  it("detects Android TV / Google TV / Chromecast", () => {
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (Linux; Android 14; Google TV Streamer) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toBe(true);
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (Linux; Android 12; Chromecast HD Build/STTL.240206.001) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36 CrKey/1.56.500000",
      ),
    ).toBe(true);
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7233) AppleWebKit/537.36 Chrome/70.0.3538.110 Safari/537.36",
      ),
    ).toBe(true);
  });

  it("does not treat phones or desktops as smart TVs", () => {
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro XL) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isSmartTvBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });

  it("adds mhgProfile=tv when enabled", () => {
    const url = withMoonlightTvProfile(
      "https://ml.example/stream.html?hostId=1&appId=0",
      true,
    );
    expect(new URL(url).searchParams.get("mhgProfile")).toBe(MOONLIGHT_TV_PROFILE);
  });

  it("leaves the URL unchanged when disabled", () => {
    const input = "https://ml.example/stream.html?hostId=1&appId=0";
    expect(withMoonlightTvProfile(input, false)).toBe(input);
  });

  it("forces Smart TV mode when ?mhgTv=1 is in the URL", () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, search: "?mhgTv=1" },
    });
    try {
      expect(isSmartTvBrowser("Mozilla/5.0 (Macintosh) Chrome/131.0.0.0")).toBe(true);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("remembers mhgTv force for the tab session after the query is dropped", () => {
    syncMhgTvSessionFromUrl("?mhgTv=1");
    expect(isMhgTvSessionForced()).toBe(true);
    expect(sessionStorage.getItem(MHG_TV_SESSION_KEY)).toBe("1");
    expect(isSmartTvBrowser("Mozilla/5.0 (Macintosh) Chrome/131.0.0.0")).toBe(true);

    syncMhgTvSessionFromUrl("");
    expect(isMhgTvSessionForced()).toBe(false);
    expect(isSmartTvBrowser("Mozilla/5.0 (Macintosh) Chrome/131.0.0.0")).toBe(false);
  });

  it("re-attaches mhgTv=1 to SPA navigations that dropped the query", () => {
    syncMhgTvSessionFromUrl("?mhgTv=1");
    expect(searchWithMhgTvPreserved("")).toBe("?mhgTv=1");
    expect(searchWithMhgTvPreserved("?foo=1")).toBe("?foo=1&mhgTv=1");
    expect(searchWithMhgTvPreserved("?mhgTv=1")).toBeNull();
    expect(searchWithMhgTvPreserved("?mhgTv=1&foo=1")).toBeNull();
  });

  it("toggles data-mhg-tv on the document element", () => {
    const el = document.createElement("html");
    applySmartTvDocumentFlag(true, el);
    expect(el.dataset.mhgTv).toBe("1");
    applySmartTvDocumentFlag(false, el);
    expect(el.dataset.mhgTv).toBeUndefined();
  });
});
