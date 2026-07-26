/// <reference path="../../index.d.ts" />

(function () {
  var cfg = window.MHG_TIZEN || {};
  var startUrl = String(cfg.startUrl || "https://myhomegames.vige.it/app/");
  var statusEl = document.getElementById("status");
  var retryBtn = document.getElementById("retry");
  var launchTimer = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function registerKeys() {
    try {
      if (typeof tizen !== "undefined" && tizen.tvinputdevice) {
        // Keep Back available; other keys are handled by the PWA after navigation.
        tizen.tvinputdevice.registerKey("Exit");
      }
    } catch (_) {
      /* Emulator / browser preview without Tizen APIs */
    }
  }

  function onVisibility() {
    // No-op hook: PWA handles multitasking after top-level navigation.
  }

  function launch() {
    setStatus("Opening library…");
    if (retryBtn) retryBtn.hidden = true;
    try {
      window.location.replace(startUrl);
    } catch (err) {
      setStatus("Could not open " + startUrl);
      if (retryBtn) retryBtn.hidden = false;
    }
  }

  function onKeyDown(event) {
    var key = event.keyCode;
    // Remote Back / Return before navigation completes
    if (key === 10009 || key === 10182) {
      try {
        if (typeof tizen !== "undefined" && tizen.application) {
          tizen.application.getCurrentApplication().exit();
        }
      } catch (_) {
        /* ignore */
      }
    }
  }

  registerKeys();
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("keydown", onKeyDown);
  if (retryBtn) {
    retryBtn.addEventListener("click", launch);
  }

  // Brief splash so the icon/brand shows, then enter the PWA (same model as Android TWA).
  launchTimer = window.setTimeout(launch, 400);

  window.addEventListener("error", function () {
    window.clearTimeout(launchTimer);
    setStatus("Launch failed. Check network and Developer Mode.");
    if (retryBtn) retryBtn.hidden = false;
  });
})();
