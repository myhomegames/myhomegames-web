/** Message type listened by the local Tizen shell (`tizen/js/main.js`). */
export const MHG_TIZEN_EXIT_MESSAGE = "mhg-tizen-exit";

type TizenApplication = {
  exit?: () => void;
  hide?: () => void;
};

type TizenWindow = Window & {
  tizen?: {
    application?: {
      getCurrentApplication?: () => TizenApplication | undefined;
    };
  };
};

function tryTizenExit(win: Window): boolean {
  try {
    const tizen = (win as TizenWindow).tizen;
    const getApp = tizen?.application?.getCurrentApplication;
    if (typeof getApp !== "function") return false;
    const app = getApp();
    if (app && typeof app.exit === "function") {
      app.exit();
      return true;
    }
  } catch {
    /* no Tizen API in this browsing context */
  }
  return false;
}

/**
 * Exit the Samsung Tizen TV application.
 * After the shell navigates (or embeds) the hosted PWA, `window.tizen` is often
 * unavailable in the remote document — the local widget listens for postMessage.
 */
export function exitSmartTvApplication(): void {
  if (tryTizenExit(window)) return;

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: MHG_TIZEN_EXIT_MESSAGE }, "*");
      return;
    }
  } catch {
    /* cross-origin parent access can throw; postMessage itself should not */
  }

  try {
    if (window.top && window.top !== window) {
      window.top.postMessage({ type: MHG_TIZEN_EXIT_MESSAGE }, "*");
      return;
    }
  } catch {
    /* ignore */
  }

  // Last-resort fallbacks (older Tizen / hosted quirks).
  try {
    const selfWin = window.open("", "_self");
    selfWin?.close();
  } catch {
    /* ignore */
  }
  try {
    window.close();
  } catch {
    /* ignore */
  }
}
