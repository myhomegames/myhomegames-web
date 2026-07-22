import { afterEach, describe, expect, it, vi } from "vitest";
import { setupPwaInstallFromQuery } from "./pwaInstall";

describe("setupPwaInstallFromQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/app/");
    document.getElementById("mhg-pwa-install")?.remove();
    delete window.__MHG_PWA__;
  });

  it("is a no-op without install=1", () => {
    window.history.replaceState({}, "", "/app/");
    const add = vi.spyOn(window, "addEventListener");
    setupPwaInstallFromQuery();
    expect(document.getElementById("mhg-pwa-install")).toBeNull();
    expect(add).not.toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    add.mockRestore();
  });

  it("shows an install banner when install=1", () => {
    window.history.replaceState({}, "", "/app/?install=1");
    window.__MHG_PWA__ = { deferred: null, listeners: [] };
    setupPwaInstallFromQuery();
    expect(document.getElementById("mhg-pwa-install")).not.toBeNull();
    expect(document.getElementById("mhg-pwa-install-btn")).not.toBeNull();
  });

  it("enables Install when a deferred prompt is already captured", () => {
    window.history.replaceState({}, "", "/app/?install=1");
    const deferred = {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
      preventDefault: vi.fn(),
    };
    window.__MHG_PWA__ = {
      deferred: deferred as unknown as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
      },
      listeners: [],
    };
    setupPwaInstallFromQuery();
    const btn = document.getElementById("mhg-pwa-install-btn") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe("Install app");
  });

  it("listens for beforeinstallprompt when install=1", () => {
    window.history.replaceState({}, "", "/app/?install=1");
    window.__MHG_PWA__ = { deferred: null, listeners: [] };
    const add = vi.spyOn(window, "addEventListener");
    setupPwaInstallFromQuery();
    expect(add).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    add.mockRestore();
  });
});
