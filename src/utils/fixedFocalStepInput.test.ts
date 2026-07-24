import { describe, expect, it, vi } from "vitest";
import { applyWheelDeltaStep } from "./stepScrollSnap";
import { readTouchStepThresholdPx } from "./fixedFocalStepInput";

describe("fixedFocalStepInput helpers", () => {
  it("readTouchStepThresholdPx falls back to 48", () => {
    expect(readTouchStepThresholdPx(document.documentElement)).toBe(48);
  });

  it("maps upward finger swipe (negative dy → positive delta) to next step", () => {
    const step = vi.fn();
    const state = { accumulated: 0 };
    // Finger moved up 50px → pass -dy = +50
    applyWheelDeltaStep(state, 50, 48, step);
    expect(step).toHaveBeenCalledWith(1);
  });

  it("maps downward finger swipe to previous step", () => {
    const step = vi.fn();
    const state = { accumulated: 0 };
    applyWheelDeltaStep(state, -50, 48, step);
    expect(step).toHaveBeenCalledWith(-1);
  });
});
