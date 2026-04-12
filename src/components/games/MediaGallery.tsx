import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { getEmbedVideoUrl } from "../../utils/api";
import "./MediaGallery.css";

type MediaGalleryProps = {
  screenshots?: string[];
  videos?: string[];
  /** If set, screenshot URLs that do not start with http will be resolved against this base (e.g. API_BASE). */
  apiBase?: string;
};

type MediaItem = {
  type: 'screenshot' | 'video';
  src: string;
  index: number;
};

export default function MediaGallery({ screenshots, videos, apiBase }: MediaGalleryProps) {
  const resolveSrc = (src: string) =>
    !src ? "" : src.startsWith("http") ? src : apiBase ? new URL(src, apiBase).toString() : src;
  const resolvedScreenshots = (screenshots || []).map(resolveSrc);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine screenshots and videos into a single array
  const screenshotsCount = resolvedScreenshots.length;
  const mediaItems: MediaItem[] = [
    ...resolvedScreenshots.map((src, index) => ({ type: 'screenshot' as const, src, index })),
    ...(videos || []).map((src, index) => ({ type: 'video' as const, src, index: screenshotsCount + index })),
  ];

  if (mediaItems.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const navigateMedia = useCallback((direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    
    if (direction === 'prev') {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : mediaItems.length - 1;
      setSelectedIndex(newIndex);
    } else {
      const newIndex = selectedIndex < mediaItems.length - 1 ? selectedIndex + 1 : 0;
      setSelectedIndex(newIndex);
    }
  }, [selectedIndex, mediaItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        navigateMedia('prev');
      } else if (e.key === 'ArrowRight') {
        navigateMedia('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, navigateMedia]);

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

  const selectedMedia = selectedIndex !== null ? mediaItems[selectedIndex] : null;

  return (
    <>
      <div ref={scrollRef} className="media-gallery-strip">
          {/* Videos first */}
          {videos && videos.map((video, index) => (
            <div
              key={`video-${index}`}
              className="media-gallery-tile"
              onClick={() => openLightbox(screenshotsCount + index)}
            >
              <iframe
                className="media-gallery-tile-iframe"
                src={getEmbedVideoUrl(video)}
                title={`Video ${index + 1}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure"
                allowFullScreen
              />
            </div>
          ))}

          {/* Screenshots after videos */}
          {resolvedScreenshots.map((screenshot, index) => (
            <img
              key={`screenshot-${index}`}
              className="media-gallery-thumb"
              src={screenshot}
              alt={`Screenshot ${index + 1}`}
              onClick={() => openLightbox(index)}
            />
          ))}
      </div>

      {/* Lightbox Modal - rendered via portal to body */}
      {selectedIndex !== null && selectedMedia && createPortal(
        <div className="media-gallery-lightbox-backdrop" onClick={closeLightbox}>
          <div className="media-gallery-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {/* Previous Button */}
            {mediaItems.length > 1 && (
              <button
                type="button"
                className="media-gallery-lightbox-icon-btn media-gallery-lightbox-icon-btn--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMedia('prev');
                }}
              >
                ‹
              </button>
            )}

            {/* Media Content */}
            {selectedMedia.type === 'screenshot' ? (
              <img
                className="media-gallery-lightbox-img"
                src={selectedMedia.src}
                alt={`Screenshot ${selectedIndex + 1}`}
              />
            ) : (
              <iframe
                className="media-gallery-lightbox-iframe"
                src={getEmbedVideoUrl(selectedMedia.src)}
                title={`Video ${selectedIndex + 1}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; compute-pressure"
                allowFullScreen
              />
            )}

            {/* Next Button */}
            {mediaItems.length > 1 && (
              <button
                type="button"
                className="media-gallery-lightbox-icon-btn media-gallery-lightbox-icon-btn--next"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMedia('next');
                }}
              >
                ›
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              className="media-gallery-lightbox-icon-btn media-gallery-lightbox-icon-btn--close"
              onClick={closeLightbox}
            >
              ×
            </button>

            {/* Media Counter */}
            {mediaItems.length > 1 && (
              <div className="media-gallery-lightbox-counter">
                {selectedIndex + 1} / {mediaItems.length}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

