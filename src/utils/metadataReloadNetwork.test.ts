import { describe, expect, it } from "vitest";

import {
  isTransientMetadataFetchError,
  isTransientMetadataHttpStatus,
} from "./metadataReloadNetwork";

describe("metadataReloadNetwork", () => {
  it("treats gateway and rate-limit statuses as transient", () => {
    expect(isTransientMetadataHttpStatus(502)).toBe(true);
    expect(isTransientMetadataHttpStatus(503)).toBe(true);
    expect(isTransientMetadataHttpStatus(504)).toBe(true);
    expect(isTransientMetadataHttpStatus(429)).toBe(true);
    expect(isTransientMetadataHttpStatus(404)).toBe(false);
    expect(isTransientMetadataHttpStatus(500)).toBe(false);
  });

  it("treats Failed to fetch as transient but not user abort", () => {
    expect(isTransientMetadataFetchError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransientMetadataFetchError(new DOMException("Aborted", "AbortError"))).toBe(false);
  });
});

describe("isBulkMetadataReloadAbortedError", () => {
  it("does not treat network AbortError as bulk cancel", async () => {
    const { isBulkMetadataReloadAbortedError } = await import("./bulkMetadataReloadContext");
    expect(isBulkMetadataReloadAbortedError(new DOMException("Aborted", "AbortError"))).toBe(
      false,
    );
  });
});
