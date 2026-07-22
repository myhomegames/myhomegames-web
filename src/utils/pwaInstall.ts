/**
 * When opened as /app/?install=1 (from the homepage Android CTA),
 * capture beforeinstallprompt and show the native install dialog once.
 */
export function setupPwaInstallFromQuery(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("install") !== "1") return;

  // Already running as installed PWA.
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      clearInstallQuery();
      return;
    }
  } catch {
    // ignore
  }

  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };

  let prompted = false;

  const onBeforeInstall = (event: Event) => {
    event.preventDefault();
    const bip = event as BeforeInstallPromptEvent;
    if (prompted || typeof bip.prompt !== "function") return;
    prompted = true;
    void bip
      .prompt()
      .then(() => bip.userChoice)
      .catch(() => undefined)
      .finally(() => {
        clearInstallQuery();
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      });
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstall);

  // If Chrome already fired the event before this listener, fall back to waiting;
  // after a short delay drop the query so the URL stays clean.
  window.setTimeout(() => {
    if (!prompted) clearInstallQuery();
  }, 8000);
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
