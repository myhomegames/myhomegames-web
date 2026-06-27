import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "../../contexts/SettingsContext";
type TooltipProps = {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  children: React.ReactNode;
  wrapperStyle?: React.CSSProperties;
};

export default function Tooltip({
  text,
  position = "bottom",
  delay = 1000,
  children,
  wrapperStyle,
}: TooltipProps) {
  const { skinWeb } = useSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const updateTooltipPosition = () => {
    if (!wrapperRef.current || !tooltipRef.current) return;

    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;
    const viewportPadding = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const centeredLeft = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    const clampedLeft = Math.max(
      viewportPadding,
      Math.min(centeredLeft, viewportWidth - tooltipRect.width - viewportPadding)
    );

    const fitsBelow = triggerRect.bottom + spacing + tooltipRect.height <= viewportHeight - viewportPadding;
    const fitsAbove = triggerRect.top - spacing - tooltipRect.height >= viewportPadding;

    let resolvedPosition: "top" | "bottom" = "bottom";
    if (position === "top") resolvedPosition = fitsAbove ? "top" : "bottom";
    else if (position === "bottom") resolvedPosition = fitsBelow ? "bottom" : "top";
    else if (position === "left" || position === "right") {
      // Keep vertical orientation for now, but still adapt to viewport limits.
      resolvedPosition = fitsBelow ? "bottom" : "top";
    }

    const top =
      resolvedPosition === "bottom"
        ? triggerRect.bottom + spacing
        : triggerRect.top - tooltipRect.height - spacing;

    setTooltipStyle({
      position: "fixed",
      top: `${Math.max(viewportPadding, top)}px`,
      left: `${clampedLeft}px`,
      zIndex: 99999,
    });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hide tooltip on click
  useEffect(() => {
    if (!isVisible) return;

    const handleClick = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(false);
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      if (wrapperRef.current) {
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;
    updateTooltipPosition();

    const onViewportChange = () => updateTooltipPosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isVisible, text, position]);

  if (skinWeb.disableTitleTooltips) {
    return (
      <div className="tooltip-wrapper" style={wrapperStyle}>
        {children}
      </div>
    );
  }

  return (
    <>
      <div
        ref={wrapperRef}
        className="tooltip-wrapper"
        style={wrapperStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <span ref={tooltipRef} className="tooltip tooltip-portal" style={tooltipStyle}>
            {text}
          </span>,
          document.body
        )}
    </>
  );
}

