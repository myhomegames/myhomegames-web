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
import {
  resolveDetailBackdropAmbientFill,
  resolveDetailBackdropVariant,
  type DetailBackdropVariant,
} from "../../utils/detailBackdropTvAmbient";

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
  /**
   * When set, ambient fill uses `backgroundUrl` and the sharp hero crop uses this URL.
   * Pass `""` to hide the sharp layer while keeping ambient tint (Recommended TV browse).
   * Omit to paint both layers from `backgroundUrl` (detail pages, focal selection).
   */
  sharpBackgroundUrl?: string;
  hasBackground: boolean;
  elementId: string;
  children: React.ReactNode;
  /** When true, show the background whenever one is available (e.g. focal selection). */
  autoShowWhenAvailable?: boolean;
  /**
   * Game/catalog/collection-like detail: enable the detail backdrop layout hook
   * (`data-mhg-background-layout="detail"` + narrow hero collapse on scroll).
   * Skin CSS decides the look (e.g. cropped hero on TV/phone); without matching
   * CSS the portal stays full-bleed.
   */
  detailBackdrop?: boolean;
  /**
   * Full-viewport ambient fill under the sharp crop. On TV skins this is often a
   * heavy blur — disable on rapid focus surfaces (Recommended browse) to keep D-pad snappy.
   */
  ambientFill?: boolean;
  /**
   * Smart TV: ambient blur + cropped hero (`tv` backdrop variant). When false on TV,
   * uses full-bleed background like skins without Plex TV backdrop CSS.
   */
  tvDetailBackdropAmbient?: boolean;
};

const STORAGE_KEY = "backgroundStates";
const DETAIL_SCROLL_SELECTOR =
  ".game-detail-scroll-container, .catalog-game-detail-scroll-container, .library-item-detail-scroll";
/** Match game-detail phone/narrow layout (~locandina breakpoint), not a tiny handset-only width. */
const NARROW_DETAIL_MQ = "(max-width: 720px)";

function clearDetailBackdropDomAttrs(portalHost: HTMLElement | null) {
  portalHost?.removeAttribute("data-mhg-background-layout");
  portalHost?.removeAttribute("data-mhg-detail-backdrop");
  document.documentElement.removeAttribute("data-mhg-background-layout");
  document.documentElement.removeAttribute("data-mhg-detail-backdrop");
}

function applyDetailBackdropDomAttrs(portalHost: HTMLElement, variant: DetailBackdropVariant) {
  portalHost.setAttribute("data-mhg-background-layout", "detail");
  portalHost.setAttribute("data-mhg-detail-backdrop", variant);
  document.documentElement.setAttribute("data-mhg-background-layout", "detail");
  document.documentElement.setAttribute("data-mhg-detail-backdrop", variant);
}

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
  sharpBackgroundUrl,
  hasBackground,
  elementId,
  children,
  autoShowWhenAvailable = false,
  detailBackdrop = false,
  ambientFill = true,
  tvDetailBackdropAmbient = true,
}: BackgroundManagerProps) {
  const splitSharpLayer = sharpBackgroundUrl !== undefined;
  const effectiveAmbientFill = resolveDetailBackdropAmbientFill(
    tvDetailBackdropAmbient,
    ambientFill,
  );
  const [isBackgroundVisible, setIsBackgroundVisible] = useState(() => {
    if (autoShowWhenAvailable && hasBackground) return true;
    return getBackgroundState(elementId, hasBackground);
  });

  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  /** Fade-in after URL paint — inline opacity beats skin `opacity: 1` on TV. */
  const [portalBgRevealed, setPortalBgRevealed] = useState(false);
  const [portalSharpRevealed, setPortalSharpRevealed] = useState(false);

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
    if (!portalHost) return;
    if (!detailBackdrop) {
      clearDetailBackdropDomAttrs(portalHost);
      return;
    }

    const syncVariant = () => {
      applyDetailBackdropDomAttrs(
        portalHost,
        resolveDetailBackdropVariant(tvDetailBackdropAmbient),
      );
    };

    syncVariant();
    window.addEventListener("resize", syncVariant);
    const mq = window.matchMedia(NARROW_DETAIL_MQ);
    mq.addEventListener?.("change", syncVariant);
    /*
     * TV flag can be applied after mount (`applySmartTvDocumentFlag` in main).
     * Re-check shortly so detail layout does not stay stuck on "wide".
     */
    const retry = window.setTimeout(syncVariant, 100);

    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("resize", syncVariant);
      mq.removeEventListener?.("change", syncVariant);
      clearDetailBackdropDomAttrs(portalHost);
    };
  }, [portalHost, detailBackdrop, tvDetailBackdropAmbient]);

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

  // Reset reveal before paint so the new URL never flashes at full opacity.
  useLayoutEffect(() => {
    setPortalBgRevealed(false);
  }, [portalHost, hasBackground, isBackgroundVisible, backgroundUrl]);

  useLayoutEffect(() => {
    if (!splitSharpLayer) return;
    setPortalSharpRevealed(false);
  }, [portalHost, hasBackground, isBackgroundVisible, sharpBackgroundUrl, splitSharpLayer]);

  // Then fade in after the opacity:0 frame is committed.
  useEffect(() => {
    const canPaint =
      Boolean(portalHost) &&
      hasBackground &&
      isBackgroundVisible &&
      backgroundUrl.trim() !== "";
    if (!canPaint) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setPortalBgRevealed(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [portalHost, hasBackground, isBackgroundVisible, backgroundUrl]);

  useEffect(() => {
    if (!splitSharpLayer) return;
    const sharpUrl = sharpBackgroundUrl?.trim() ?? "";
    const canPaint =
      Boolean(portalHost) &&
      hasBackground &&
      isBackgroundVisible &&
      sharpUrl !== "";
    if (!canPaint) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setPortalSharpRevealed(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [
    portalHost,
    hasBackground,
    isBackgroundVisible,
    sharpBackgroundUrl,
    splitSharpLayer,
  ]);

  /* Narrow detail: collapse hero height on scroll (content starts below the slot). */
  useEffect(() => {
    if (!portalHost || !detailBackdrop || !hasBackground || !isBackgroundVisible) {
      portalHost?.style.removeProperty("--mhg-bg-hero-height");
      portalHost?.style.removeProperty("--mhg-bg-hero-slot");
      portalHost?.style.removeProperty("--mhg-bg-content-offset");
      document.documentElement.style.removeProperty("--mhg-bg-hero-height");
      document.documentElement.style.removeProperty("--mhg-bg-hero-slot");
      document.documentElement.style.removeProperty("--mhg-bg-content-offset");
      portalHost?.style.setProperty("--mhg-bg-scroll-fade", "1");
      return;
    }

    let scroller: HTMLElement | null = null;
    let cancelled = false;

    const clearCollapseVars = () => {
      portalHost.style.removeProperty("--mhg-bg-hero-height");
      portalHost.style.removeProperty("--mhg-bg-hero-slot");
      portalHost.style.removeProperty("--mhg-bg-content-offset");
      document.documentElement.style.removeProperty("--mhg-bg-hero-height");
      document.documentElement.style.removeProperty("--mhg-bg-hero-slot");
      document.documentElement.style.removeProperty("--mhg-bg-content-offset");
      portalHost.style.setProperty("--mhg-bg-scroll-fade", "1");
    };

    const syncCollapse = () => {
      if (cancelled) return;
      if (resolveDetailBackdropVariant(tvDetailBackdropAmbient) !== "narrow") {
        clearCollapseVars();
        return;
      }
      const slot = Math.max(Math.round(window.innerHeight * 0.4), 140);
      /* Content starts higher than the hero bottom so it blends into the art. */
      const contentOffset = Math.max(Math.round(slot * 0.58), 96);
      const scrollTop = scroller?.scrollTop ?? 0;
      const height = Math.max(0, slot - scrollTop);
      const slotPx = `${slot}px`;
      const heightPx = `${height}px`;
      const offsetPx = `${contentOffset}px`;
      portalHost.style.setProperty("--mhg-bg-hero-slot", slotPx);
      portalHost.style.setProperty("--mhg-bg-hero-height", heightPx);
      portalHost.style.setProperty("--mhg-bg-content-offset", offsetPx);
      document.documentElement.style.setProperty("--mhg-bg-hero-slot", slotPx);
      document.documentElement.style.setProperty("--mhg-bg-hero-height", heightPx);
      document.documentElement.style.setProperty("--mhg-bg-content-offset", offsetPx);
      portalHost.style.setProperty("--mhg-bg-scroll-fade", "1");
    };

    const bindScroller = () => {
      if (cancelled) return;
      const next = document.querySelector<HTMLElement>(DETAIL_SCROLL_SELECTOR);
      if (next === scroller) {
        syncCollapse();
        return;
      }
      scroller?.removeEventListener("scroll", syncCollapse);
      scroller = next;
      scroller?.addEventListener("scroll", syncCollapse, { passive: true });
      syncCollapse();
    };

    bindScroller();
    const timeouts = [50, 200, 500].map((ms) => window.setTimeout(bindScroller, ms));
    window.addEventListener("resize", syncCollapse);
    const mq = window.matchMedia(NARROW_DETAIL_MQ);
    mq.addEventListener?.("change", syncCollapse);

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      scroller?.removeEventListener("scroll", syncCollapse);
      window.removeEventListener("resize", syncCollapse);
      mq.removeEventListener?.("change", syncCollapse);
      clearCollapseVars();
    };
  }, [portalHost, detailBackdrop, hasBackground, isBackgroundVisible, backgroundUrl, tvDetailBackdropAmbient]);

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

  const imageOnlyStyle: CSSProperties | undefined =
    hasBackground && isBackgroundVisible && backgroundUrl.trim() !== ""
      ? {
          backgroundImage: backgroundImageValue(backgroundUrl),
          backgroundRepeat: "no-repeat",
        }
      : undefined;

  const portalImageStyle: CSSProperties | undefined = imageOnlyStyle
    ? {
        ...imageOnlyStyle,
        opacity: portalBgRevealed ? 1 : 0,
        transition: "opacity 0.55s ease-out",
      }
    : undefined;

  const sharpUrl = splitSharpLayer ? sharpBackgroundUrl?.trim() ?? "" : "";
  const portalSharpImageStyle: CSSProperties | undefined =
    splitSharpLayer && hasBackground && isBackgroundVisible && sharpUrl !== ""
      ? {
          backgroundImage: backgroundImageValue(sharpUrl),
          backgroundRepeat: "no-repeat",
          opacity: portalSharpRevealed ? 1 : 0,
          transition: "opacity 0.55s ease-out",
        }
      : splitSharpLayer
        ? { opacity: 0, transition: "opacity 0s" }
        : undefined;

  /*
   * Portal paints full viewport when mounted; keep root paint only until the portal
   * host exists (first frame). Never stack image on both — that caused two-tone columns.
   * Size/position live in skin CSS (defaults: cover / center).
   */
  const paintedBackgroundStyle = showPortalPaint
    ? undefined
    : imageOnlyStyle
      ? {
          ...imageOnlyStyle,
          backgroundSize: "cover" as const,
          backgroundPosition: "center" as const,
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
        {/* Edge/ambient fill — skins blur/scale this under the sharp crop on TV. */}
        {effectiveAmbientFill ? (
          <div
            className="background-manager-portal-bg-fill"
            style={portalImageStyle}
            aria-hidden="true"
          />
        ) : null}
        <div
          className="background-manager-portal-bg"
          style={splitSharpLayer ? portalSharpImageStyle : portalImageStyle}
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
