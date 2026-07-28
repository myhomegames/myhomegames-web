import { describe, expect, it, beforeEach } from "vitest";
import {
  clearCachedSkinCss,
  getCachedSkinCss,
  isStaleTvSkinCss,
  setCachedSkinCss,
} from "./skinCssCache";

const SKIN_ID = "ce8a00d6-50fe-4a5c-8a9c-911661e2ed12";

describe("skinCssCache", () => {
  beforeEach(() => {
    clearCachedSkinCss();
  });

  it("detects legacy TV yellow focus CSS as stale", () => {
    expect(
      isStaleTvSkinCss(
        'html[data-mhg-tv="1"] :focus { outline: 3px solid #e5a00d; }',
      ),
    ).toBe(true);
    expect(
      isStaleTvSkinCss(
        '.cover { color: red; } html[data-mhg-tv="1"] [tabindex]:focus-visible { outline: 3px solid #e5a00d; }',
      ),
    ).toBe(true);
  });

  it("accepts bundles with TV hover mirror selectors", () => {
    expect(
      isStaleTvSkinCss(
        '.item:is(:hover, [data-mhg-tv-hover]) { transform: scale(1.08); }',
      ),
    ).toBe(false);
  });

  it("drops cached CSS when schema or bundle is stale", () => {
    setCachedSkinCss(SKIN_ID, 'html[data-mhg-tv="1"] :focus { outline: 3px solid #e5a00d; }');
    expect(getCachedSkinCss(SKIN_ID)).toBeNull();

    setCachedSkinCss(
      SKIN_ID,
      '.item:is(:hover, [data-mhg-tv-hover]) { outline: none; }',
    );
    expect(getCachedSkinCss(SKIN_ID)).toContain("data-mhg-tv-hover");
  });
});
