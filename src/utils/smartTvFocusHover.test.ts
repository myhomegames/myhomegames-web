import { describe, expect, it, afterEach } from "vitest";
import {
  SMART_TV_HOVER_ATTR,
  installSmartTvFocusHoverMirror,
  syncSmartTvSelectionHover,
} from "./smartTvFocusHover";

describe("smartTvFocusHover", () => {
  afterEach(() => {
    document.querySelectorAll(`[${SMART_TV_HOVER_ATTR}]`).forEach((el) => {
      el.removeAttribute(SMART_TV_HOVER_ATTR);
    });
  });

  it("sets hover mirror attribute on focusin", () => {
    const cleanup = installSmartTvFocusHoverMirror(true);
    const btn = document.createElement("button");
    btn.textContent = "Play";
    document.body.appendChild(btn);
    btn.focus();
    expect(btn.getAttribute(SMART_TV_HOVER_ATTR)).toBe("true");
    cleanup();
    btn.remove();
  });

  it("clears hover mirror on focusout unless scale-selected", () => {
    const cleanup = installSmartTvFocusHoverMirror(true);
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    btn.focus();
    btn.blur();
    expect(btn.hasAttribute(SMART_TV_HOVER_ATTR)).toBe(false);
    cleanup();
    btn.remove();
  });

  it("keeps hover mirror on scale-selected tiles", () => {
    installSmartTvFocusHoverMirror(true);
    const tile = document.createElement("div");
    tile.className = "fixed-focal-games-item mhg-cover-scale-selected";
    document.body.appendChild(tile);
    syncSmartTvSelectionHover(true);
    expect(tile.getAttribute(SMART_TV_HOVER_ATTR)).toBe("true");
    tile.classList.remove("mhg-cover-scale-selected");
    syncSmartTvSelectionHover(true);
    expect(tile.hasAttribute(SMART_TV_HOVER_ATTR)).toBe(false);
    tile.remove();
  });

  it("sets hover mirror attribute on logo focus", () => {
    const cleanup = installSmartTvFocusHoverMirror(true);
    const logo = document.createElement("button");
    logo.className = "mhg-logo-button";
    document.body.appendChild(logo);
    logo.focus();
    expect(logo.getAttribute(SMART_TV_HOVER_ATTR)).toBe("true");
    cleanup();
    logo.remove();
  });
});
