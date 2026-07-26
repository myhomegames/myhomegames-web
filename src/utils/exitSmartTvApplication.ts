/** Exit the Tizen (or compatible) Smart TV application process. */
export function exitSmartTvApplication(): void {
  try {
    const tizen = (
      window as unknown as {
        tizen?: {
          application?: {
            getCurrentApplication?: () => { exit?: () => void } | undefined;
          };
        };
      }
    ).tizen;
    const getApp = tizen?.application?.getCurrentApplication;
    if (typeof getApp !== "function") return;
    const app = getApp();
    if (app && typeof app.exit === "function") {
      app.exit();
    }
  } catch {
    /* Emulator / browser without Tizen APIs */
  }
}
