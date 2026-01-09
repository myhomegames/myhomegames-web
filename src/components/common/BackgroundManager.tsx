import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";

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

  return (
    <BackgroundContext.Provider value={contextValue}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: hasBackground && isBackgroundVisible ? 'transparent' : '#1a1a1a',
          backgroundImage: hasBackground && isBackgroundVisible ? `url(${backgroundUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          zIndex: 0,
          cursor: hasBackground && isBackgroundVisible ? 'pointer' : 'default'
        }}
        onClick={() => {
          if (hasBackground && isBackgroundVisible) {
            handleVisibilityChange(false);
          }
        }}
      >
        {hasBackground && isBackgroundVisible && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(26, 26, 26, 0.85)',
                zIndex: 1
              }}
            />
            <img
              src={backgroundUrl}
              alt=""
              style={{ display: 'none' }}
            />
          </>
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </BackgroundContext.Provider>
  );
}

