import { afterEach, describe, expect, it, vi } from "vitest";
import { setupPwaInstallFromQuery } from "./pwaInstall";

describe("setupPwaInstallFromQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/app/");
  });

  it("is a no-op without install=1", () => {
    window.history.replaceState({}, "", "/app/");
    const add = vi.spyOn(window, "addEventListener");
    setupPwaInstallFromQuery();
    expect(add).not.toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    add.mockRestore();
  });

  it("listens for beforeinstallprompt when install=1", () => {
    window.history.replaceState({}, "", "/app/?install=1");
    const add = vi.spyOn(window, "addEventListener");
    setupPwaInstallFromQuery();
    expect(add).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
    add.mockRestore();
  });
});
