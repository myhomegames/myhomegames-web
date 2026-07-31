import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { getEmbedVideoUrl, getVideoPosterUrl } from "../../utils/api";
import { requestSmartTvUiLayerFocus } from "../../utils/smartTvRemote";

type MediaGalleryProps = {
  screenshots?: string[];
  videos?: string[];
  /** If set, screenshot URLs that do not start with http will be resolved against this base (e.g. API_BASE). */
  apiBase?: string;
};

type MediaItem = {
  type: "screenshot" | "video";
  src: string;
  index: number;
};

export default function MediaGallery({ screenshots, videos, apiBase }: MediaGalleryProps) {
  const resolveSrc = (src: string) =>
    !src ? "" : src.startsWith("http") ? src : apiBase ? new URL(src, apiBase).toString() : src;
  const resolvedScreenshots = (screenshots || []).map(resolveSrc);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [videoAutoplay, setVideoAutoplay] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const screenshotsCount = resolvedScreenshots.length;
  const mediaItems: MediaItem[] = [
    ...resolvedScreenshots.map((src, index) => ({ type: "screenshot" as const, src, index })),
    ...(videos || []).map((src, index) => ({
      type: "video" as const,
      src,
      index: screenshotsCount + index,
    })),
  ];

  const openLightbox = (index: number, autoplayVideo = false) => {
    setVideoAutoplay(autoplayVideo);
    setSelectedIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    setVideoAutoplay(false);
  }, []);

  const navigateMedia = useCallback(
    (direction: "prev" | "next") => {
      setSelectedIndex((current) => {
        if (current === null || mediaItems.length === 0) return current;
        const next =
          direction === "prev"
            ? current > 0
              ? current - 1
              : mediaItems.length - 1
            : current < mediaItems.length - 1
              ? current + 1
              : 0;
        setVideoAutoplay(false);
        return next;
      });
    },
    [mediaItems.length],
  );

  // Smart TV remote: arrows step slides; OK activates / plays the current video.
  useEffect(() => {
    if (selectedIndex === null) return;

    requestSmartTvUiLayerFocus();

    const onRemoteNav = (e: Event) => {
      const detail = (e as CustomEvent<{ direction?: "prev" | "next" }>).detail;
      if (detail?.direction === "prev" || detail?.direction === "next") {
        navigateMedia(detail.direction);
      }
    };

    const onRemoteOk = () => {
      const item = mediaItems[selectedIndex];
      if (!item) return;
      if (item.type === "video") {
        setVideoAutoplay(true);
      }
    };

    window.addEventListener("mhg:media-gallery-nav", onRemoteNav);
    window.addEventListener("mhg:media-gallery-ok", onRemoteOk);
    return () => {
      window.removeEventListener("mhg:media-gallery-nav", onRemoteNav);
      window.removeEventListener("mhg:media-gallery-ok", onRemoteOk);
    };
  }, [selectedIndex, mediaItems, navigateMedia]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      const isOverContainer =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isOverContainer) return;

      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
      if (!hasHorizontalScroll) return;

      const isPrimarilyHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (isPrimarilyHorizontal || Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        e.stopPropagation();

        const currentScrollLeft = container.scrollLeft;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const canScrollLeft = currentScrollLeft > 0 && e.deltaX < 0;
        const canScrollRight = currentScrollLeft < maxScrollLeft && e.deltaX > 0;

        if (canScrollLeft || canScrollRight) {
          container.scrollLeft += e.deltaX;
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  if (mediaItems.length === 0) {
    return null;
  }

  const selectedMedia = selectedIndex !== null ? mediaItems[selectedIndex] : null;

  return (
    <>
      <div ref={scrollRef} className="media-gallery-strip">
        {videos &&
          videos.map((video, index) => {
            const poster = getVideoPosterUrl(video);
            return (
              <button
                key={`video-${index}`}
                type="button"
                className="media-gallery-tile media-gallery-tile--video"
                onClick={() => openLightbox(screenshotsCount + index, true)}
                aria-label={`Video ${index + 1}`}
              >
                {poster ? (
                  <img
                    className="media-gallery-tile-poster"
                    src={poster}
                    alt=""
                    draggable={false}
                  />
                ) : (
                  <div className="media-gallery-tile-poster media-gallery-tile-poster--fallback" />
                )}
                <span className="media-gallery-tile-play" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            );
          })}

        {resolvedScreenshots.map((screenshot, index) => (
          <button
            key={`screenshot-${index}`}
            type="button"
            className="media-gallery-thumb-button"
            onClick={() => openLightbox(index, false)}
          >
            <img
              className="media-gallery-thumb"
              src={screenshot}
              alt={`Screenshot ${index + 1}`}
            />
          </button>
        ))}
      </div>

      {selectedIndex !== null &&
        selectedMedia &&
        createPortal(
          <div
            className="media-gallery-lightbox-backdrop"
            data-mhg-media-gallery-lightbox=""
            tabIndex={-1}
            onClick={closeLightbox}
          >
            <div className="media-gallery-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              {mediaItems.length > 1 && (
                <button
                  type="button"
                  className="media-gallery-lightbox-icon-btn media-gallery-lightbox-icon-btn--prev"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateMedia("prev");
                  }}
                >
                  ‹
                </button>
              )}

              {selectedMedia.type === "screenshot" ? (
                <img
                  className="media-gallery-lightbox-img"
                  src={selectedMedia.src}
                  alt={`Screenshot ${selectedIndex + 1}`}
                />
              ) : (
                <iframe
                  key={`${selectedMedia.src}-${videoAutoplay ? "play" : "idle"}`}
                  className="media-gallery-lightbox-iframe"
                  src={getEmbedVideoUrl(selectedMedia.src, { autoplay: videoAutoplay })}
                  title={`Video ${selectedIndex + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure"
                  allowFullScreen
                />
              )}

              {mediaItems.length > 1 && (
                <button
                  type="button"
                  className="media-gallery-lightbox-icon-btn media-gallery-lightbox-icon-btn--next"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateMedia("next");
                  }}
                >
                  ›
                </button>
              )}

              <button
                type="button"
                className="media-gallery-lightbox-icon-btn media-gallery-lightbox-icon-btn--close"
                tabIndex={-1}
                onClick={closeLightbox}
              >
                ×
              </button>

              {mediaItems.length > 1 && (
                <div className="media-gallery-lightbox-counter">
                  {selectedIndex + 1} / {mediaItems.length}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
