import { usePhoneLayout } from "./usePhoneLayout";
import { isSmartTvBrowser } from "../utils/smartTv";

/** Phone + Smart TV: hide cover overlay buttons; actions open from a context menu on long-press. */
export function useCompactCoverChrome(): boolean {
  const isPhone = usePhoneLayout();
  return isPhone || isSmartTvBrowser();
}
