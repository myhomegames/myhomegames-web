import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { exitSmartTvApplication } from "../../utils/exitSmartTvApplication";
import { isSmartTvBrowser } from "../../utils/smartTv";

/**
 * Confirm before closing the Tizen app when Back is pressed on the home screen.
 * Driven by `mhg:tv-request-exit` from smartTvRemote.
 */
export default function TvExitConfirmDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isSmartTvBrowser()) return;

    const onRequest = () => setOpen(true);
    const onCancel = () => setOpen(false);
    window.addEventListener("mhg:tv-request-exit", onRequest);
    window.addEventListener("mhg:tv-exit-confirm-cancel", onCancel);
    return () => {
      window.removeEventListener("mhg:tv-request-exit", onRequest);
      window.removeEventListener("mhg:tv-exit-confirm-cancel", onCancel);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const tId = window.setTimeout(() => {
      try {
        cancelRef.current?.focus({ preventScroll: true });
      } catch {
        cancelRef.current?.focus();
      }
    }, 50);
    return () => window.clearTimeout(tId);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onTvBack = (event: Event) => {
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener("mhg:tv-hardware-back", onTvBack);
    return () => window.removeEventListener("mhg:tv-hardware-back", onTvBack);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="dropdown-menu-confirm-overlay mhg-tv-exit-confirm"
      data-mhg-tv-exit-confirm
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="dropdown-menu-confirm-container"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="mhg-tv-exit-title"
        aria-describedby="mhg-tv-exit-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dropdown-menu-confirm-header">
          <h2 id="mhg-tv-exit-title">{t("common.exitAppTitle", "Exit MyHomeGames?")}</h2>
          <button
            type="button"
            className="dropdown-menu-confirm-close"
            onClick={() => setOpen(false)}
            aria-label={t("common.close", "Close")}
          >
            ×
          </button>
        </div>
        <div className="dropdown-menu-confirm-content">
          <p id="mhg-tv-exit-desc">
            {t("common.exitAppMessage", "Do you want to close the application?")}
          </p>
        </div>
        <div className="dropdown-menu-confirm-footer">
          <button
            ref={cancelRef}
            type="button"
            className="dropdown-menu-confirm-cancel"
            data-mhg-tv-focus
            onClick={() => setOpen(false)}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            className="dropdown-menu-confirm-delete"
            data-mhg-tv-focus
            onClick={() => exitSmartTvApplication()}
          >
            {t("common.exitAppConfirm", "Exit")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
