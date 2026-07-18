import { useCallback, useEffect, useState } from "react";
import { getApiBase } from "../config";
import { buildApiHeaders } from "../utils/api";

export type StreamingStatus = {
  remoteStreamingEnabled: boolean;
  moonlightWebUrl: string;
  sunshineReachable: boolean;
  ready: boolean;
};

const DEFAULT_STATUS: StreamingStatus = {
  remoteStreamingEnabled: true,
  moonlightWebUrl: "",
  sunshineReachable: false,
  ready: false,
};

export function useStreamingStatus(): {
  status: StreamingStatus;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<StreamingStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/streaming/status", getApiBase());
      const res = await fetch(url.toString(), {
        headers: buildApiHeaders({ Accept: "application/json" }),
      });
      if (!res.ok) {
        setStatus(DEFAULT_STATUS);
        return;
      }
      const data = (await res.json()) as StreamingStatus;
      setStatus({
        remoteStreamingEnabled: !!data.remoteStreamingEnabled,
        moonlightWebUrl: typeof data.moonlightWebUrl === "string" ? data.moonlightWebUrl : "",
        sunshineReachable: !!data.sunshineReachable,
        ready: !!data.ready,
      });
    } catch {
      setStatus(DEFAULT_STATUS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
