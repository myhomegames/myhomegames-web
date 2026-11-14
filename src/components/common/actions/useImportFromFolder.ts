import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import { schedulePostGameImportLibraryRefresh } from "../../../utils/librarySyncEvents";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function formatWaitLabel(ms: number | null | undefined, fallbackText = ""): string {
  if (Number.isFinite(ms) && Number(ms) > 0) {
    const totalSec = Math.max(1, Math.ceil(Number(ms) / 1000));
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    return `${secs}s`;
  }
  const fromText = String(fallbackText || "").match(
    /try again in about\s+([^.]+?)(?:\.|$)/i
  );
  return (fromText?.[1] || "").trim() || "—";
}

function isRateLimitPayload(payload: {
  code?: string | null;
  aiErrorCode?: string | null;
  error?: string | null;
  aiError?: string | null;
  message?: string | null;
}): boolean {
  const code = String(payload.code || payload.aiErrorCode || "");
  if (code === "AI_RATE_LIMIT") return true;
  const text = String(payload.error || payload.aiError || payload.message || "");
  return /rate limit/i.test(text) || /tokens per day/i.test(text) || /try again in about/i.test(text);
}

function buildPartialImportNotice(t: TranslateFn, json: FolderImportResponse): string {
  const summary = json.summary || ({} as FolderImportSummary);
  const count = Math.max(
    0,
    Number(summary.imported || 0) +
      Number(summary.created || 0) +
      Number(summary.exists || 0) ||
      (Array.isArray(json.results) ? json.results.length : 0)
  );
  if (
    isRateLimitPayload({
      aiErrorCode: summary.aiErrorCode,
      aiError: summary.aiError,
    })
  ) {
    return t("addGame.importFromFolderPartialRateLimit", {
      count,
      wait: formatWaitLabel(summary.retryAfterMs, summary.aiError || ""),
    });
  }
  return t("addGame.importFromFolderPartial", { count });
}

function buildImportErrorMessage(
  t: TranslateFn,
  payload: {
    code?: string | null;
    error?: string | null;
    message?: string | null;
    retryAfterMs?: number | null;
    stats?: { apiCalls?: number } | null;
  }
): string {
  if (isRateLimitPayload(payload)) {
    const wait = formatWaitLabel(payload.retryAfterMs, payload.error || payload.message || "");
    const apiCalls = Number(payload.stats?.apiCalls || 0);
    if (apiCalls > 0) {
      return t("addGame.importFromFolderRateLimitResume", { wait, apiCalls });
    }
    return t("addGame.importFromFolderRateLimit", { wait });
  }
  return String(payload.error || payload.message || t("addGame.importFromFolderFailed"));
}

class FolderImportStreamError extends Error {
  code: string | null;
  retryAfterMs: number | null;
  stats: { apiCalls?: number } | null;

  constructor(payload: {
    error?: string;
    code?: string | null;
    retryAfterMs?: number | null;
    stats?: { apiCalls?: number } | null;
  }) {
    super(payload.error || "Import failed");
    this.name = "FolderImportStreamError";
    this.code = payload.code || null;
    this.retryAfterMs = Number.isFinite(payload.retryAfterMs)
      ? Number(payload.retryAfterMs)
      : null;
    this.stats = payload.stats || null;
  }
}

export type FolderImportResult = {
  filePath: string;
  guessedTitle: string;
  status: string;
  gameId: number | string | null;
  catalogGameId: number | string | null;
  catalogName: string | null;
  error?: string;
};

export type FolderImportSummary = {
  scanned: number;
  imported: number;
  created: number;
  exists: number;
  skipped?: number;
  wouldImport: number;
  wouldCreate: number;
  errors: number;
  catalogEnabled: boolean;
  aiEnabled?: boolean;
  aiUsed?: boolean;
  aiModel?: string | null;
  aiError?: string | null;
  aiErrorCode?: string | null;
  retryAfterMs?: number | null;
  aiApiCalls?: number;
  aiCacheHits?: number;
};

export type FolderImportResponse = {
  status: string; // "success" | "partial" | ...
  folderPath: string;
  dryRun: boolean;
  summary: FolderImportSummary;
  results: FolderImportResult[];
};

export type FolderImportProgress = {
  phase: string;
  current: number;
  total: number;
  percent: number;
  label?: string;
};

type UseImportFromFolderParams = {
  onImported?: (response: FolderImportResponse) => void;
  onError?: (error: string) => void;
};

type UseImportFromFolderReturn = {
  isImporting: boolean;
  isPickingFolder: boolean;
  importError: string | null;
  /** Non-fatal notice (e.g. partial import) shown beside Import. */
  importNotice: string | null;
  importProgress: FolderImportProgress | null;
  lastImport: FolderImportResponse | null;
  pickImportFolder: (options?: {
    prompt?: string;
    defaultPath?: string;
  }) => Promise<string | null>;
  importFromFolder: (folderPath: string) => Promise<FolderImportResponse | null>;
};

async function readFolderImportSse(
  res: Response,
  onProgress: (progress: FolderImportProgress) => void
): Promise<FolderImportResponse> {
  if (!res.body) {
    throw new Error("Missing response body for import stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: FolderImportResponse | null = null;
  let streamError: {
    error?: string;
    code?: string | null;
    retryAfterMs?: number | null;
    stats?: { apiCalls?: number } | null;
  } | null = null;

  const consumeBlock = (block: string) => {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    const dataText = dataLines.join("\n");
    let data: unknown = null;
    try {
      data = JSON.parse(dataText);
    } catch {
      return;
    }
    if (eventName === "progress" && data && typeof data === "object") {
      const p = data as Partial<FolderImportProgress>;
      onProgress({
        phase: String(p.phase || ""),
        current: Number(p.current) || 0,
        total: Number(p.total) || 0,
        percent: Math.max(0, Math.min(100, Number(p.percent) || 0)),
        label: typeof p.label === "string" ? p.label : undefined,
      });
      return;
    }
    if (eventName === "done" && data && typeof data === "object") {
      donePayload = data as FolderImportResponse;
      return;
    }
    if (eventName === "error" && data && typeof data === "object") {
      streamError = data as {
        error?: string;
        code?: string | null;
        retryAfterMs?: number | null;
        stats?: { apiCalls?: number } | null;
      };
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");
    let sep;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      consumeBlock(block);
    }
  }
  if (buffer.trim()) consumeBlock(buffer);

  if (streamError) throw new FolderImportStreamError(streamError);
  if (!donePayload) throw new Error("Import stream ended without a result");
  return donePayload;
}

export function useImportFromFolder({
  onImported,
  onError,
}: UseImportFromFolderParams = {}): UseImportFromFolderReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isImporting, setIsImporting] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<FolderImportProgress | null>(null);
  const [lastImport, setLastImport] = useState<FolderImportResponse | null>(null);

  const pickImportFolder = async (options?: {
    prompt?: string;
    defaultPath?: string;
  }): Promise<string | null> => {
    setIsPickingFolder(true);
    setImportError(null);
    setImportNotice(null);
    try {
      const url = buildApiUrl(API_BASE, "/games/pick-import-folder");
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({
          prompt: options?.prompt,
          defaultPath: options?.defaultPath,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        setImportError(errorMsg);
        if (onError) onError(errorMsg);
        return null;
      }

      const json = await res.json();
      if (json.status === "cancelled" || !json.folderPath) {
        return null;
      }
      return String(json.folderPath);
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to open folder picker";
      console.error("Error picking import folder:", error);
      setImportError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    } finally {
      setIsPickingFolder(false);
    }
  };

  const importFromFolder = async (
    folderPath: string
  ): Promise<FolderImportResponse | null> => {
    const pathValue = typeof folderPath === "string" ? folderPath.trim() : "";
    if (!pathValue) {
      const errorMsg = "Folder path is required";
      setImportError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    }

    setIsImporting(true);
    setImportError(null);
    setImportNotice(null);
    setImportProgress({ phase: "scan", current: 0, total: 1, percent: 0 });
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, "/games/import-from-folder");
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders({
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        }),
        body: JSON.stringify({ folderPath: pathValue, stream: true }),
      });

      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      const isSse = contentType.includes("text/event-stream");

      if (!res.ok && !isSse) {
        const errorData = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string | null;
          retryAfterMs?: number | null;
          stats?: { apiCalls?: number } | null;
        };
        const errorMsg = buildImportErrorMessage(t, errorData);
        setImportError(errorMsg);
        if (onError) onError(errorMsg);
        return null;
      }

      const json = isSse
        ? await readFolderImportSse(res, setImportProgress)
        : ((await res.json()) as FolderImportResponse);

      if (!isSse && !res.ok) {
        const errorMsg = buildImportErrorMessage(t, {
          error: (json as { error?: string })?.error,
          code: (json as { code?: string })?.code,
          retryAfterMs: (json as { retryAfterMs?: number })?.retryAfterMs,
          stats: (json as { stats?: { apiCalls?: number } })?.stats,
        });
        setImportError(errorMsg);
        if (onError) onError(errorMsg);
        return null;
      }

      setImportProgress({ phase: "done", current: 1, total: 1, percent: 100 });
      setLastImport(json);
      window.dispatchEvent(
        new CustomEvent("gamesImportedFromFolder", { detail: { summary: json.summary } })
      );
      schedulePostGameImportLibraryRefresh();
      if (json.status === "partial") {
        setImportNotice(buildPartialImportNotice(t, json));
      } else {
        setImportNotice(null);
      }
      if (onImported) onImported(json);
      return json;
    } catch (error: unknown) {
      const errorMsg =
        error instanceof FolderImportStreamError
          ? buildImportErrorMessage(t, {
              error: error.message,
              code: error.code,
              retryAfterMs: error.retryAfterMs,
              stats: error.stats,
            })
          : error instanceof Error
            ? buildImportErrorMessage(t, { error: error.message, message: error.message })
            : t("addGame.importFromFolderFailed");
      console.error("Error importing games from folder:", error);
      setImportError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      setLoading(false);
    }
  };

  return {
    isImporting,
    isPickingFolder,
    importError,
    importNotice,
    importProgress,
    lastImport,
    pickImportFolder,
    importFromFolder,
  };
}
