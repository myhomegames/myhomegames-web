import { getApiBase, getApiToken } from "../config";
import { buildApiHeaders } from "./api";

const PENDING_STOP_KEY = "mhg-pending-stream-stop";

export type PendingStreamStop = {
  hostId: number | null;
  gameId: string;
  executableName?: string;
  /** Absolute /streaming/stop URL (preferred; includes token query when present). */
  stopUrl?: string;
};

function buildStopUrl(opts: PendingStreamStop): string {
  if (opts.stopUrl) return opts.stopUrl;
  const url = new URL("/streaming/stop", getApiBase());
  if (opts.hostId != null && Number.isFinite(opts.hostId)) {
    url.searchParams.set("hostId", String(opts.hostId));
  }
  if (opts.gameId) url.searchParams.set("gameId", opts.gameId);
  if (opts.executableName) url.searchParams.set("executableName", opts.executableName);
  const token = getApiToken();
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

function readPending(): PendingStreamStop | null {
  try {
    const raw = sessionStorage.getItem(PENDING_STOP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingStreamStop;
  } catch {
    return null;
  }
}

/** Remember stop params before top-level navigate to Moonlight Web (smart TV). */
export function stashPendingStreamStop(opts: PendingStreamStop): void {
  try {
    const payload: PendingStreamStop = {
      ...opts,
      stopUrl: buildStopUrl(opts),
    };
    sessionStorage.setItem(PENDING_STOP_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPendingStreamStop(): PendingStreamStop | null {
  return readPending();
}

export function clearPendingStreamStop(): void {
  try {
    sessionStorage.removeItem(PENDING_STOP_KEY);
  } catch {
    /* ignore */
  }
}

/** Fire /streaming/stop if a TV Moonlight redirect left a pending session. */
export function flushPendingStreamStop(): boolean {
  const opts = readPending();
  if (!opts?.gameId) return false;
  clearPendingStreamStop();

  const stopUrl = buildStopUrl(opts);
  const headers = buildApiHeaders({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const body = JSON.stringify({
    ...(opts.hostId != null && Number.isFinite(opts.hostId) ? { hostId: opts.hostId } : {}),
    ...(opts.gameId ? { gameId: opts.gameId } : {}),
    ...(opts.executableName ? { executableName: opts.executableName } : {}),
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(stopUrl, new Blob([body], { type: "application/json" }));
    }
  } catch {
    /* ignore */
  }

  void fetch(stopUrl, {
    method: "POST",
    headers,
    body,
    keepalive: true,
    mode: "cors",
    credentials: "omit",
  }).catch(() => {
    void fetch(stopUrl, {
      method: "GET",
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    }).catch(() => {});
  });

  return true;
}

/** Install once: flush when returning to MHG after Moonlight Back / BFCache. */
export function installPendingStreamStopFlush(): () => void {
  if (typeof window === "undefined") return () => {};

  const shouldDeferToStreamPlayPage = (): boolean => {
    try {
      return /\/play\/[^/]+/i.test(window.location.pathname);
    } catch {
      return false;
    }
  };

  const onShow = () => {
    // /play/:id handles pending stop itself (avoid clearing before it can skip relaunch).
    if (shouldDeferToStreamPlayPage()) return;
    flushPendingStreamStop();
  };

  onShow();
  window.addEventListener("pageshow", onShow);
  window.addEventListener("focus", onShow);
  return () => {
    window.removeEventListener("pageshow", onShow);
    window.removeEventListener("focus", onShow);
  };
}
