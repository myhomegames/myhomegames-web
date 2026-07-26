/** Exit the Tizen (or compatible) Smart TV application process. */
export function exitSmartTvApplication(): void {
  try {
    const tizen = (
      window as unknown as {
        tizen?: {
          application?: {
            getCurrentApplication?: () => { exit: () => void };
          };
        };
      }
    ).tizen;
    tizen?.application?.getCurrentApplication()?.exit();
  } catch {
    /* Emulator / browser without Tizen APIs */
  }
}
