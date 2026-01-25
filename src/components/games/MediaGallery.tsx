import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

type MediaGalleryProps = {
  screenshots?: string[];
  videos?: string[];
};

type MediaItem = {
  type: 'screenshot' | 'video';
  src: string;
  index: number;
};

export default function MediaGallery({ screenshots, videos }: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Combine screenshots and videos into a single array
  const screenshotsCount = screenshots?.length || 0;
  const mediaItems: MediaItem[] = [
    ...(screenshots || []).map((src, index) => ({ type: 'screenshot' as const, src, index })),
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
      <div
        ref={scrollRef}
        style={{ 
          display: 'flex', 
          flexDirection: 'row',
          gap: '12px',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
        }}>
          {/* Videos first */}
          {videos && videos.map((video, index) => (
            <div
              key={`video-${index}`}
                    onClick={() => openLightbox(screenshotsCount + index)}
              style={{
                flexShrink: 0,
                width: '300px',
                borderRadius: '4px',
                cursor: 'pointer',
                aspectRatio: '16/9',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <iframe
                src={video}
                title={`Video ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '4px',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}

          {/* Screenshots after videos */}
          {screenshots && screenshots.map((screenshot, index) => (
            <img
              key={`screenshot-${index}`}
              src={screenshot}
              alt={`Screenshot ${index + 1}`}
                    onClick={() => openLightbox(index)}
              style={{
                flexShrink: 0,
                width: '300px',
                height: 'auto',
                borderRadius: '4px',
                cursor: 'pointer',
                objectFit: 'cover',
                aspectRatio: '16/9',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          ))}
      </div>

      {/* Lightbox Modal - rendered via portal to body */}
      {selectedIndex !== null && selectedMedia && createPortal(
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 10010,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Previous Button */}
            {mediaItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMedia('prev');
                }}
                style={{
                  position: 'absolute',
                  left: '-60px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                ‹
              </button>
            )}

            {/* Media Content */}
            {selectedMedia.type === 'screenshot' ? (
              <img
                src={selectedMedia.src}
                alt={`Screenshot ${selectedIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  borderRadius: '4px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <iframe
                src={selectedMedia.src}
                title={`Video ${selectedIndex + 1}`}
                style={{
                  width: '90vw',
                  maxWidth: '1600px',
                  aspectRatio: '16/9',
                  borderRadius: '4px',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}

            {/* Next Button */}
            {mediaItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateMedia('next');
                }}
                style={{
                  position: 'absolute',
                  right: '-60px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                ›
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute',
                top: '-60px',
                right: '0',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ×
            </button>

            {/* Media Counter */}
            {mediaItems.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-40px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'white',
                  fontFamily: 'var(--font-body-2-font-family)',
                  fontSize: 'var(--font-body-2-font-size)',
                  opacity: 0.8,
                }}
              >
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

