import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./LaunchModal.css";

type LaunchModalProps = {
  isLaunching: boolean;
  launchError: string | null;
  onClose: () => void;
};

export default function LaunchModal({
  isLaunching,
  launchError,
  onClose,
}: LaunchModalProps) {
  const { t } = useTranslation();

  // Block body scroll when modal is open
  useEffect(() => {
    if (isLaunching || launchError) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLaunching, launchError]);

  // Handle ESC key to close modals
  useEffect(() => {
    if (!isLaunching && !launchError) return;
    
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLaunching, launchError, onClose]);

  return (
    <>
      {/* Loading Modal - shown during game launch */}
      {isLaunching && createPortal(
        <div className="launch-modal-overlay" onClick={onClose}>
          <div className="launch-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="launch-modal-spinner" />
          </div>
        </div>,
        document.body
      )}

      {/* Error Modal - only shown when launch fails */}
      {launchError && createPortal(
        <div className="launch-modal-overlay" onClick={onClose}>
          <div className="launch-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="launch-modal-error-title">
              ⚠️ {t("launch.error")}
            </div>
            <div className="launch-modal-error-message">
              {launchError}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

