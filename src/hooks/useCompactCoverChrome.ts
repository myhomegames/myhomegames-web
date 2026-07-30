import { usePhoneLayout } from "./usePhoneLayout";
import { isSmartTvBrowser } from "../utils/smartTv";

/** Phone + Smart TV: cover actions live in the long-press context menu, not on the cover image. */
export function useCompactCoverChrome(): boolean {
  const isPhone = usePhoneLayout();
  return isPhone || isSmartTvBrowser();
}
