import { useEffect, useState } from "react";
import {
  detectServerOs,
  resolveServerDownloadOffer,
  SERVER_RELEASES_URL,
  type ServerDownloadOffer,
  type ServerOsKind,
} from "../utils/serverDownload";

export type ServerDownloadState = ServerDownloadOffer & {
  loading: boolean;
};

export function useServerDownload(): ServerDownloadState {
  const [state, setState] = useState<ServerDownloadState>(() => ({
    loading: true,
    url: SERVER_RELEASES_URL,
    os: detectServerOs(),
    fileName: null,
    platformSpecific: false,
  }));

  useEffect(() => {
    let cancelled = false;
    void resolveServerDownloadOffer().then((offer) => {
      if (!cancelled) {
        setState({ loading: false, ...offer });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export type { ServerOsKind };
