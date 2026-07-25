import { describe, expect, it } from "vitest";
import {
  applySmartTvDocumentFlag,
  isSmartTvBrowser,
  MOONLIGHT_TV_PROFILE,
  withMoonlightTvProfile,
} from "./smartTv";

describe("smartTv", () => {
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

  it("toggles data-mhg-tv on the document element", () => {
    const el = document.createElement("html");
    applySmartTvDocumentFlag(true, el);
    expect(el.dataset.mhgTv).toBe("1");
    applySmartTvDocumentFlag(false, el);
    expect(el.dataset.mhgTv).toBeUndefined();
  });
});
