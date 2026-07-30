import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attachCoverPointerLongPress,
  COVER_LONG_PRESS_EVENT,
  COVER_LONG_PRESS_MS,
  dispatchCoverLongPress,
} from "./coverLongPress";

describe("coverLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches the cover long-press event", () => {
    const handler = vi.fn();
    document.addEventListener(COVER_LONG_PRESS_EVENT, handler);
    dispatchCoverLongPress();
    expect(handler).toHaveBeenCalledTimes(1);
    document.removeEventListener(COVER_LONG_PRESS_EVENT, handler);
  });

  it("fires pointer long-press after the configured delay", () => {
    const element = document.createElement("div");
    const onLongPress = vi.fn();
    const cleanup = attachCoverPointerLongPress(element, onLongPress, 300);

    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 0, clientY: 0 }),
    );
    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("cancels long-press when the pointer moves too far", () => {
    const element = document.createElement("div");
    const onLongPress = vi.fn();
    const cleanup = attachCoverPointerLongPress(element, onLongPress, COVER_LONG_PRESS_MS);

    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 0, clientY: 0 }),
    );
    element.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, clientX: 20, clientY: 0 }),
    );

    vi.advanceTimersByTime(COVER_LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();

    cleanup();
  });

  it("cancels long-press on pointer up before the delay", () => {
    const element = document.createElement("div");
    const onLongPress = vi.fn();
    const cleanup = attachCoverPointerLongPress(element, onLongPress, COVER_LONG_PRESS_MS);

    element.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 0, clientY: 0 }),
    );
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    vi.advanceTimersByTime(COVER_LONG_PRESS_MS);
    expect(onLongPress).not.toHaveBeenCalled();

    cleanup();
  });
});
