import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";

type BackgroundContextType = {
  hasBackground: boolean;
  isBackgroundVisible: boolean;
  setBackgroundVisible: (visible: boolean) => void;
};

const BackgroundContext = createContext<BackgroundContextType | null>(null);

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) {
    return {
      hasBackground: false,
      isBackgroundVisible: false,
      setBackgroundVisible: () => {},
    };
  }
  return context;
}

type BackgroundManagerProps = {
  backgroundUrl: string;
  hasBackground: boolean;
  elementId: string;
  children: React.ReactNode;
  /** When true, show the background whenever one is available (e.g. focal selection). */
  autoShowWhenAvailable?: boolean;
};

const STORAGE_KEY = "backgroundStates";

function backgroundImageValue(url: string): string {
  return `url(${JSON.stringify(url)})`;
}

const getBackgroundStates = (): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveBackgroundState = (elementId: string, visible: boolean) => {
  const states = getBackgroundStates();
  states[elementId] = visible;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
};

const getBackgroundState = (elementId: string, defaultVisible: boolean): boolean => {
  const states = getBackgroundStates();
  return states[elementId] ?? defaultVisible;
};

export default function BackgroundManager({
  backgroundUrl,
  hasBackground,
  elementId,
  children,
  autoShowWhenAvailable = false,
}: BackgroundManagerProps) {
  const [isBackgroundVisible, setIsBackgroundVisible] = useState(() => {
    if (autoShowWhenAvailable && hasBackground) return true;
    return getBackgroundState(elementId, hasBackground);
  });

  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    /*
     * Portal is the first child of #root so it shares the app stacking context
     * (fixed full-bleed layer under .background-manager-foreground). Mounting on
     * body before #root left the image behind z-index:1 #root and invisible once
     * page shells went transparent for context-rail backdrops.
     */
    const mount = document.createElement("div");
    mount.setAttribute("data-mhg-background-portal", "");
    mount.setAttribute("aria-hidden", "true");
    mount.style.position = "fixed";
    mount.style.inset = "0";
    mount.style.width = "100vw";
    mount.style.height = "100dvh";
    mount.style.minHeight = "100vh";
    mount.style.pointerEvents = "none";
    mount.style.zIndex = "0";
    root.insertBefore(mount, root.firstChild);
    setPortalHost(mount);
    return () => {
      mount.remove();
      setPortalHost(null);
    };
  }, []);

  useEffect(() => {
    if (!hasBackground) {
      setIsBackgroundVisible(false);
      return;
    }
    if (autoShowWhenAvailable) {
      setIsBackgroundVisible(true);
      return;
    }
    const savedState = getBackgroundState(elementId, hasBackground);
    setIsBackgroundVisible(savedState);
  }, [hasBackground, backgroundUrl, elementId, autoShowWhenAvailable]);

  useEffect(() => {
    const on = hasBackground && isBackgroundVisible;
    if (on) {
      document.documentElement.setAttribute("data-mhg-background-visible", "true");
    } else {
      document.documentElement.removeAttribute("data-mhg-background-visible");
    }
    return () => {
      document.documentElement.removeAttribute("data-mhg-background-visible");
    };
  }, [hasBackground, isBackgroundVisible]);

  const handleVisibilityChange = useCallback(
    (visible: boolean) => {
      setIsBackgroundVisible(visible);
      saveBackgroundState(elementId, visible);
    },
    [elementId]
  );

  const contextValue: BackgroundContextType = useMemo(
    () => ({
      hasBackground,
      isBackgroundVisible,
      setBackgroundVisible: handleVisibilityChange,
    }),
    [hasBackground, isBackgroundVisible, handleVisibilityChange]
  );

  const bgLayerStyle = {
    backgroundColor: hasBackground && isBackgroundVisible ? "transparent" : "#1a1a1a",
    /*
     * Full-screen fixed layer sits after the persistent shell LibrariesBar in the DOM; with the
     * same stacking level it would paint on top and steal all clicks (header stays usable only
     * because it uses a higher z-index). Let events reach the shell and the foreground content.
     */
    pointerEvents: "none",
  } as CSSProperties;

  const showPortalPaint =
    Boolean(portalHost) && hasBackground && isBackgroundVisible && backgroundUrl.trim() !== "";

  /*
   * Portal paints full viewport when mounted; keep root paint only until the portal
   * host exists (first frame). Never stack image on both — that caused two-tone columns.
   */
  const paintedBackgroundStyle =
    showPortalPaint
      ? undefined
      : hasBackground && isBackgroundVisible && backgroundUrl.trim() !== ""
        ? {
            backgroundImage: backgroundImageValue(backgroundUrl),
            backgroundSize: "cover" as const,
            backgroundPosition: "center" as const,
            backgroundRepeat: "no-repeat" as const,
          }
        : undefined;

  /*
   * Foreground must participate in flex layouts (e.g. `.home-page-layout > .home-page-content-wrapper`).
   * When BackgroundManager sits between a flex parent and that wrapper, missing flex:1 collapses the
   * scroll column — vertical cover rails only show a sliver of the selected cover.
   */
  const foregroundStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    position: "relative",
    zIndex: 2,
    pointerEvents: "none",
  };

  const portalLayer =
    showPortalPaint &&
    createPortal(
      <>
        <div
          className="background-manager-portal-bg"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            backgroundImage: backgroundImageValue(backgroundUrl),
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="background-manager-portal-overlay" aria-hidden="true" />
      </>,
      portalHost!
    );

  return (
    <BackgroundContext.Provider value={contextValue}>
      {portalLayer}
      <div
        className={`background-manager-root${hasBackground && isBackgroundVisible ? " background-manager-root--clickable" : " background-manager-root--solid"}`}
        style={{ ...bgLayerStyle, ...paintedBackgroundStyle }}
      >
        {hasBackground && isBackgroundVisible && !showPortalPaint && (
          <div className="background-manager-overlay" />
        )}
      </div>
      <div className="background-manager-foreground" style={foregroundStyle}>
        {children}
      </div>
    </BackgroundContext.Provider>
  );
}
