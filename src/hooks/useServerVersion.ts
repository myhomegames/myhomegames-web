import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config";
import { buildApiUrl } from "../utils/api";
import {
  parseServerVersionPayload,
  type ServerVersionInfo,
} from "../utils/apiCompatibility";

export type ServerVersionState = ServerVersionInfo & {
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useServerVersion(): ServerVersionState {
  const [info, setInfo] = useState<ServerVersionInfo>({
    version: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildApiUrl(API_BASE, "/version");
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setInfo(parseServerVersionPayload(json));
    } catch (e) {
      setInfo({ version: null });
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const onApiBaseChanged = () => {
      void refetch();
    };
    window.addEventListener("mhg-api-base-changed", onApiBaseChanged);
    return () => window.removeEventListener("mhg-api-base-changed", onApiBaseChanged);
  }, [refetch]);

  return {
    ...info,
    loading,
    error,
    refetch,
  };
}
