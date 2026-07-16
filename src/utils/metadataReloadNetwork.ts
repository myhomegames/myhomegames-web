import {
  isBulkMetadataReloadAbortedError,
  isBulkMetadataReloadRunning,
  throwIfMetadataReloadAborted,
} from "./bulkMetadataReloadContext";

export const BULK_METADATA_FETCH_MAX_ATTEMPTS = 4;
export const BULK_METADATA_FETCH_RETRY_BASE_MS = 2000;

export function isTransientMetadataHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function isTransientMetadataFetchError(error: unknown): boolean {
  if (isBulkMetadataReloadAbortedError(error)) return false;
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return false;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Retry fetch during bulk metadata reload on tunnel/gateway blips (502, Failed to fetch, …). */
export async function fetchWithBulkMetadataRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!isBulkMetadataReloadRunning()) {
    return fetch(input, init);
  }

  const signal = init?.signal;
  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= BULK_METADATA_FETCH_MAX_ATTEMPTS; attempt += 1) {
    throwIfMetadataReloadAborted();

    try {
      const response = await fetch(input, init);
      if (isTransientMetadataHttpStatus(response.status) && attempt < BULK_METADATA_FETCH_MAX_ATTEMPTS) {
        lastResponse = response;
        await delay(BULK_METADATA_FETCH_RETRY_BASE_MS * attempt, signal);
        continue;
      }
      return response;
    } catch (error) {
      if (isBulkMetadataReloadAbortedError(error)) throw error;
      lastError = error;
      if (!isTransientMetadataFetchError(error) || attempt >= BULK_METADATA_FETCH_MAX_ATTEMPTS) {
        throw error;
      }
      await delay(BULK_METADATA_FETCH_RETRY_BASE_MS * attempt, signal);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new TypeError("Failed to fetch");
}
