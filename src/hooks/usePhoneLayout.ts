import { useEffect, useState } from "react";

/** Plex header + libraries bar compact layout (matches skin `@media (max-width: 479px)`). */
export const PHONE_LAYOUT_MAX_WIDTH = 479;

export function usePhoneLayout(): boolean {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${PHONE_LAYOUT_MAX_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PHONE_LAYOUT_MAX_WIDTH}px)`);
    const onChange = () => setIsPhone(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}
