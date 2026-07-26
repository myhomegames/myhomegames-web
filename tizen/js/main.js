/// <reference path="../../index.d.ts" />

/**
 * Local Tizen widget shell.
 * Keeps `window.tizen` in this document and embeds the hosted PWA in an iframe so
 * Exit can be requested via postMessage ({ type: "mhg-tizen-exit" }).
 */
(function () {
  var cfg = window.MHG_TIZEN || {};
  var startUrl = String(cfg.startUrl || "https://myhomegames.vige.it/app/");
  var statusEl = document.getElementById("status");
  var retryBtn = document.getElementById("retry");
  var splashEl = document.getElementById("splash");
  var frameEl = document.getElementById("pwa");
  var launchTimer = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function exitApp() {
    try {
      if (typeof tizen !== "undefined" && tizen.application) {
        tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (_) {
      /* ignore */
    }
    try {
      var w = window.open("", "_self");
      if (w) w.close();
    } catch (_) {
      /* ignore */
    }
  }

  function registerKeys() {
    try {
      if (typeof tizen !== "undefined" && tizen.tvinputdevice) {
        tizen.tvinputdevice.registerKey("Exit");
      }
    } catch (_) {
      /* Emulator / browser preview without Tizen APIs */
    }
  }

  function focusFrame() {
    if (!frameEl) return;
    try {
      frameEl.focus();
    } catch (_) {
      /* ignore */
    }
    try {
      if (frameEl.contentWindow) frameEl.contentWindow.focus();
    } catch (_) {
      /* cross-origin focus may fail; still try element focus */
    }
  }

  function showFrame() {
    if (splashEl) splashEl.hidden = true;
    if (frameEl) {
      frameEl.hidden = false;
      focusFrame();
    }
  }

  function launch() {
    setStatus("Opening library…");
    if (retryBtn) retryBtn.hidden = true;
    if (!frameEl) {
      setStatus("Missing PWA frame");
      if (retryBtn) retryBtn.hidden = false;
      return;
    }
    try {
      frameEl.src = startUrl;
      // Reveal after the frame starts loading; focus when ready.
      showFrame();
    } catch (err) {
      setStatus("Could not open " + startUrl);
      if (retryBtn) retryBtn.hidden = false;
      if (splashEl) splashEl.hidden = false;
    }
  }

  function onKeyDown(event) {
    var key = event.keyCode;
    // Exit key (and Back only while splash is still visible)
    if (key === 10182) {
      event.preventDefault();
      exitApp();
      return;
    }
    if ((key === 10009 || key === 461) && splashEl && !splashEl.hidden) {
      event.preventDefault();
      exitApp();
    }
  }

  function onMessage(event) {
    var data = event && event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "mhg-tizen-exit") {
      exitApp();
    }
  }

  function onHwKey(e) {
    try {
      if (e && e.keyName === "back" && splashEl && !splashEl.hidden) {
        exitApp();
      }
    } catch (_) {
      /* ignore */
    }
  }

  registerKeys();
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("message", onMessage);
  window.addEventListener("tizenhwkey", onHwKey);
  if (frameEl) {
    frameEl.addEventListener("load", focusFrame);
  }
  if (retryBtn) {
    retryBtn.addEventListener("click", launch);
  }

  // Brief splash so the icon/brand shows, then embed the PWA.
  launchTimer = window.setTimeout(launch, 400);

  window.addEventListener("error", function () {
    window.clearTimeout(launchTimer);
    setStatus("Launch failed. Check network and Developer Mode.");
    if (retryBtn) retryBtn.hidden = false;
    if (splashEl) splashEl.hidden = false;
    if (frameEl) frameEl.hidden = true;
  });
})();
