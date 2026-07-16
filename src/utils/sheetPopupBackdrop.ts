import type { MouseEvent as ReactMouseEvent } from "react";

/** Full-viewport sheet popups: close when clicking the dim band or empty panel space. */
export function bindSheetBackdropClose(
  enabled: boolean,
  onClose: () => void,
): { onMouseDown?: (event: ReactMouseEvent<HTMLElement>) => void } {
  if (!enabled) return {};
  return {
    onMouseDown(event) {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
  };
}
