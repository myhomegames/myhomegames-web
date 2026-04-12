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
}: BackgroundManagerProps) {
  const [isBackgroundVisible, setIsBackgroundVisible] = useState(() =>
    getBackgroundState(elementId, hasBackground)
  );

  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;
    /* Portal sits before #root in the DOM; skins should set #root { position: relative; z-index: 1 } so the app paints above this layer. */
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
    document.body.insertBefore(mount, root);
    setPortalHost(mount);
    return () => {
      mount.remove();
      setPortalHost(null);
    };
  }, []);

  useEffect(() => {
    if (hasBackground) {
      const savedState = getBackgroundState(elementId, hasBackground);
      setIsBackgroundVisible(savedState);
    } else {
      setIsBackgroundVisible(false);
    }
  }, [hasBackground, backgroundUrl, elementId]);

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
  } as CSSProperties;

  const showPortalPaint =
    Boolean(portalHost) && hasBackground && isBackgroundVisible && backgroundUrl.trim() !== "";

  const portalLayer =
    showPortalPaint &&
    createPortal(
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
      />,
      portalHost!
    );

  return (
    <BackgroundContext.Provider value={contextValue}>
      {portalLayer}
      <div
        className={`background-manager-root${hasBackground && isBackgroundVisible ? " background-manager-root--clickable" : " background-manager-root--solid"}`}
        style={bgLayerStyle}
        onClick={() => {
          if (hasBackground && isBackgroundVisible) {
            handleVisibilityChange(false);
          }
        }}
      >
        {hasBackground && isBackgroundVisible && <div className="background-manager-overlay" />}
      </div>
      <div className="background-manager-foreground">{children}</div>
    </BackgroundContext.Provider>
  );
}
