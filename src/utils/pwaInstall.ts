type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type MhgPwaState = {
  deferred: BeforeInstallPromptEvent | null;
  listeners: Array<(event: BeforeInstallPromptEvent) => void>;
};

declare global {
  interface Window {
    __MHG_PWA__?: MhgPwaState;
  }
}

function getPwaState(): MhgPwaState {
  if (!window.__MHG_PWA__) {
    window.__MHG_PWA__ = { deferred: null, listeners: [] };
  }
  return window.__MHG_PWA__;
}

function isStandalonePwa(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function isIosClient(): boolean {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  return (
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

function clearInstallQuery(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("install")) return;
    url.searchParams.delete("install");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, next);
  } catch {
    // ignore
  }
}

async function promptInstall(event: BeforeInstallPromptEvent): Promise<"accepted" | "dismissed" | "error"> {
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice?.outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    return "error";
  }
}

function removeInstallUi(root: HTMLElement): void {
  root.remove();
}

/**
 * Visible install affordance — Chrome often requires a fresh user gesture for prompt().
 * Also covers the case where beforeinstallprompt fired before the React bundle loaded
 * (captured early via index.html → window.__MHG_PWA__).
 */
function showInstallUi(options: {
  mode: "android" | "ios" | "waiting";
  onInstallClick: () => void;
}): HTMLElement {
  const existing = document.getElementById("mhg-pwa-install");
  if (existing) existing.remove();

  const root = document.createElement("div");
  root.id = "mhg-pwa-install";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-live", "polite");
  Object.assign(root.style, {
    position: "fixed",
    left: "12px",
    right: "12px",
    bottom: "12px",
    zIndex: "99999",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "rgba(20, 20, 20, 0.96)",
    color: "#fff",
    boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
    fontFamily: "IBM Plex Sans, system-ui, sans-serif",
    fontSize: "14px",
    lineHeight: "1.4",
  } as CSSStyleDeclaration);

  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  } as CSSStyleDeclaration);

  const text = document.createElement("p");
  text.style.margin = "0";
  if (options.mode === "ios") {
    text.textContent =
      "Install MyHomeGames: tap Share, then Add to Home Screen.";
  } else if (options.mode === "waiting") {
    text.textContent =
      "Install MyHomeGames on this device. If the button stays disabled, use Chrome menu → Install app.";
  } else {
    text.textContent = "Install MyHomeGames on this device for quick access.";
  }

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", "Dismiss");
  dismiss.textContent = "✕";
  Object.assign(dismiss.style, {
    flexShrink: "0",
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    fontSize: "16px",
    cursor: "pointer",
    padding: "0 2px",
  } as CSSStyleDeclaration);
  dismiss.addEventListener("click", () => {
    removeInstallUi(root);
    clearInstallQuery();
  });

  row.append(text, dismiss);
  root.append(row);

  if (options.mode !== "ios") {
    const installBtn = document.createElement("button");
    installBtn.type = "button";
    installBtn.id = "mhg-pwa-install-btn";
    installBtn.textContent =
      options.mode === "waiting" ? "Install (waiting…)" : "Install app";
    installBtn.disabled = options.mode === "waiting";
    Object.assign(installBtn.style, {
      border: "none",
      borderRadius: "8px",
      padding: "10px 14px",
      fontWeight: "600",
      fontSize: "14px",
      cursor: options.mode === "waiting" ? "default" : "pointer",
      background: options.mode === "waiting" ? "rgba(255,255,255,0.2)" : "#E5A00D",
      color: options.mode === "waiting" ? "rgba(255,255,255,0.7)" : "#111",
    } as CSSStyleDeclaration);
    installBtn.addEventListener("click", () => {
      if (installBtn.disabled) return;
      options.onInstallClick();
    });
    root.append(installBtn);
  }

  document.body.append(root);
  return root;
}

function enableInstallButton(): void {
  const btn = document.getElementById("mhg-pwa-install-btn") as HTMLButtonElement | null;
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = "Install app";
  btn.style.cursor = "pointer";
  btn.style.background = "#E5A00D";
  btn.style.color = "#111";
}

/**
 * When opened as /app/?install=1 (from the homepage mobile CTA):
 * use the early-captured beforeinstallprompt (index.html) and show an Install
 * button so Chrome gets a fresh user gesture after uninstall / late BIP.
 */
export function setupPwaInstallFromQuery(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("install") !== "1") return;

  if (isStandalonePwa()) {
    clearInstallQuery();
    return;
  }

  const state = getPwaState();
  let ui: HTMLElement | null = null;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    state.deferred = null;
    if (ui) removeInstallUi(ui);
    clearInstallQuery();
  };

  const runPrompt = () => {
    const deferred = state.deferred;
    if (!deferred || typeof deferred.prompt !== "function") return;
    void promptInstall(deferred).finally(() => {
      finish();
    });
  };

  if (isIosClient()) {
    ui = showInstallUi({
      mode: "ios",
      onInstallClick: () => undefined,
    });
    return;
  }

  const hasDeferred = Boolean(state.deferred && typeof state.deferred.prompt === "function");
  ui = showInstallUi({
    mode: hasDeferred ? "android" : "waiting",
    onInstallClick: runPrompt,
  });

  const onDeferred = (event: BeforeInstallPromptEvent) => {
    state.deferred = event;
    enableInstallButton();
  };
  state.listeners.push(onDeferred);

  // Also listen directly in case the early script was missing (tests / odd hosts).
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    onDeferred(event as BeforeInstallPromptEvent);
  });
}
