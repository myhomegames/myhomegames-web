import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isSmartTvBrowser } from "../../utils/smartTv";

type SmartTvClockProps = {
  /**
   * Show 12-hour time with AM/PM.
   * Default: off for Italian (`it`), on for other languages.
   */
  showAmPm?: boolean;
};

function prefersAmPmForLocale(locale: string): boolean {
  const lang = locale.toLowerCase().split(/[-_]/)[0] ?? "";
  return lang !== "it";
}

function formatClock(now: Date, locale: string, showAmPm: boolean): string {
  try {
    return now.toLocaleTimeString(locale || undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: showAmPm,
      ...(showAmPm ? { hourCycle: "h12" as const } : { hourCycle: "h23" as const }),
    });
  } catch {
    const m = String(now.getMinutes()).padStart(2, "0");
    if (!showAmPm) {
      return `${String(now.getHours()).padStart(2, "0")}:${m}`;
    }
    const hour24 = now.getHours();
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${m} ${period}`;
  }
}

function toLocalDateTimeMinute(now: Date): string {
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function nextMinuteDelayMs(now = new Date()): number {
  return Math.max(250, (60 - now.getSeconds()) * 1000 - now.getMilliseconds());
}

/**
 * Living-room clock for Smart TV: sits after libraries-bar action icons.
 * Not remote-focusable (plain text, no tabindex).
 */
export default function SmartTvClock({ showAmPm }: SmartTvClockProps) {
  const { i18n, t } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  const useAmPm = showAmPm ?? prefersAmPmForLocale(i18n.language);

  useEffect(() => {
    if (!isSmartTvBrowser()) return;

    let intervalId: number | null = null;
    let timeoutId: number | null = null;

    const tick = () => setNow(new Date());

    tick();
    timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 60_000);
    }, nextMinuteDelayMs());

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, []);

  if (!isSmartTvBrowser()) return null;

  return (
    <div
      className={`mhg-smart-tv-clock${useAmPm ? " mhg-smart-tv-clock--ampm" : ""}`}
      aria-label={t("header.clock", "Clock")}
      aria-live="polite"
      aria-atomic="true"
    >
      <time dateTime={toLocalDateTimeMinute(now)}>
        {formatClock(now, i18n.language, useAmPm)}
      </time>
    </div>
  );
}
