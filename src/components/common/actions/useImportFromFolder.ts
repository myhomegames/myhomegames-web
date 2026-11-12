import { useState } from "react";
import { API_BASE } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import { schedulePostGameImportLibraryRefresh } from "../../../utils/librarySyncEvents";

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
};

export type FolderImportResponse = {
  status: string;
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
  let streamError: string | null = null;

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
      const err = data as { error?: string };
      streamError = err.error || "Import failed";
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

  if (streamError) throw new Error(streamError);
  if (!donePayload) throw new Error("Import stream ended without a result");
  return donePayload;
}

export function useImportFromFolder({
  onImported,
  onError,
}: UseImportFromFolderParams = {}): UseImportFromFolderReturn {
  const { setLoading } = useLoading();
  const [isImporting, setIsImporting] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<FolderImportProgress | null>(null);
  const [lastImport, setLastImport] = useState<FolderImportResponse | null>(null);

  const pickImportFolder = async (options?: {
    prompt?: string;
    defaultPath?: string;
  }): Promise<string | null> => {
    setIsPickingFolder(true);
    setImportError(null);
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
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        setImportError(errorMsg);
        if (onError) onError(errorMsg);
        return null;
      }

      const json = isSse
        ? await readFolderImportSse(res, setImportProgress)
        : ((await res.json()) as FolderImportResponse);

      if (!isSse && !res.ok) {
        const errorMsg = (json as { error?: string })?.error || `HTTP ${res.status}`;
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
      if (onImported) onImported(json);
      return json;
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to import from folder";
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
    importProgress,
    lastImport,
    pickImportFolder,
    importFromFolder,
  };
}
