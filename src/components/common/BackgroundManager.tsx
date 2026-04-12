import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import type { CSSProperties } from "react";
import "./BackgroundManager.css";

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

  useEffect(() => {
    if (hasBackground) {
      const savedState = getBackgroundState(elementId, hasBackground);
      setIsBackgroundVisible(savedState);
    } else {
      setIsBackgroundVisible(false);
    }
  }, [hasBackground, backgroundUrl, elementId]);

  const handleVisibilityChange = useCallback((visible: boolean) => {
    setIsBackgroundVisible(visible);
    saveBackgroundState(elementId, visible);
  }, [elementId]);

  const contextValue: BackgroundContextType = useMemo(() => ({
    hasBackground,
    isBackgroundVisible,
    setBackgroundVisible: handleVisibilityChange,
  }), [hasBackground, isBackgroundVisible, handleVisibilityChange]);

  const bgLayerStyle = {
    backgroundColor: hasBackground && isBackgroundVisible ? "transparent" : "#1a1a1a",
    backgroundImage: hasBackground && isBackgroundVisible ? `url(${backgroundUrl})` : undefined,
  } as CSSProperties;

  return (
    <BackgroundContext.Provider value={contextValue}>
      <div
        className={`background-manager-root${hasBackground && isBackgroundVisible ? " background-manager-root--clickable" : " background-manager-root--solid"}`}
        style={bgLayerStyle}
        onClick={() => {
          if (hasBackground && isBackgroundVisible) {
            handleVisibilityChange(false);
          }
        }}
      >
        {hasBackground && isBackgroundVisible && (
          <>
            <div className="background-manager-overlay" />
            <img src={backgroundUrl} alt="" className="hidden" />
          </>
        )}
      </div>
      <div className="background-manager-foreground">{children}</div>
    </BackgroundContext.Provider>
  );
}

