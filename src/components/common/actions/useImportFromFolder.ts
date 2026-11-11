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

type UseImportFromFolderParams = {
  onImported?: (response: FolderImportResponse) => void;
  onError?: (error: string) => void;
};

type UseImportFromFolderReturn = {
  isImporting: boolean;
  isPickingFolder: boolean;
  importError: string | null;
  lastImport: FolderImportResponse | null;
  pickImportFolder: (options?: {
    prompt?: string;
    defaultPath?: string;
  }) => Promise<string | null>;
  importFromFolder: (folderPath: string) => Promise<FolderImportResponse | null>;
};

export function useImportFromFolder({
  onImported,
  onError,
}: UseImportFromFolderParams = {}): UseImportFromFolderReturn {
  const { setLoading } = useLoading();
  const [isImporting, setIsImporting] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
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
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, "/games/import-from-folder");
      const res = await fetch(url, {
        method: "POST",
        headers: buildApiHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({ folderPath: pathValue }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        setImportError(errorMsg);
        if (onError) onError(errorMsg);
        return null;
      }

      const json = (await res.json()) as FolderImportResponse;
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
      setLoading(false);
    }
  };

  return {
    isImporting,
    isPickingFolder,
    importError,
    lastImport,
    pickImportFolder,
    importFromFolder,
  };
}
