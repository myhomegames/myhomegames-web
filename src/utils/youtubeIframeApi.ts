/**
 * Lazy-load the YouTube IFrame API and create controllable players for Smart TV remotes.
 */

export type YouTubePlayerLike = {
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    elementId: string | HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YouTubePlayerLike }) => void;
        onStateChange?: (e: { data: number; target: YouTubePlayerLike }) => void;
      };
    },
  ) => YouTubePlayerLike;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Official YT.PlayerState.PLAYING */
export const YT_PLAYING = 1;
/** Official YT.PlayerState.PAUSED */
export const YT_PAUSED = 2;

const API_SRC = "https://www.youtube.com/iframe_api";
let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires window"));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } catch {
        /* ignore */
      }
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API failed to load"));
    };

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube IFrame API script"));
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

export type CreateYouTubePlayerOptions = {
  element: HTMLElement;
  videoId: string;
  autoplay?: boolean;
  onReady?: (player: YouTubePlayerLike) => void;
};

export async function createYouTubePlayer(
  options: CreateYouTubePlayerOptions,
): Promise<YouTubePlayerLike> {
  const YT = await loadYouTubeIframeApi();
  const { element, videoId, autoplay = false, onReady } = options;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (player: YouTubePlayerLike) => {
      if (settled) return;
      settled = true;
      resolve(player);
    };
    try {
      const player = new YT.Player(element, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            onReady?.(e.target);
            finish(e.target);
          },
        },
      });
      window.setTimeout(() => finish(player), 4000);
    } catch (err) {
      reject(err);
    }
  });
}

export function toggleYouTubePlayback(player: YouTubePlayerLike): void {
  const state = player.getPlayerState();
  if (state === YT_PLAYING || state === 3 /* BUFFERING */) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

const DEFAULT_SEEK_SECONDS = 10;

export function seekYouTubePlayer(
  player: YouTubePlayerLike,
  direction: "backward" | "forward",
  seconds: number = DEFAULT_SEEK_SECONDS,
): void {
  const current = player.getCurrentTime() || 0;
  const duration = player.getDuration() || 0;
  const delta = direction === "forward" ? seconds : -seconds;
  const next = Math.max(0, Math.min(duration || current + Math.abs(delta), current + delta));
  player.seekTo(next, true);
}
