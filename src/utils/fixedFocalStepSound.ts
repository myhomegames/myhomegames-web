let audioContext: AudioContext | null = null;
let unlockAttached = false;

function attachUnlockListeners(): void {
  if (unlockAttached || typeof window === "undefined") return;
  unlockAttached = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx?.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
  window.addEventListener("wheel", unlock, { capture: true, passive: true });
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  attachUnlockListeners();
  if (!audioContext) {
    const Ctx =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

/** Short navigation tick for fixed-focal rails (Web Audio — no asset file). */
export function playFixedFocalStepSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => {
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, start);
    osc.frequency.exponentialRampToValueAtTime(520, start + 0.05);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.075);
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => {});
    return;
  }
  play();
}

export function notifyFixedFocalIndexChange(
  previousIndex: number,
  nextIndex: number,
  enabled: boolean,
): void {
  if (!enabled || nextIndex === previousIndex) return;
  playFixedFocalStepSound();
}
