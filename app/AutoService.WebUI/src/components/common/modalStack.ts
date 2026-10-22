/** The open modal dialogs, oldest first. Only the topmost reacts to Escape and Tab, so a confirm over a detail
 * closes alone, and the app shell behind them is inert for as long as any dialog is open. */

const openDialogs: HTMLElement[] = [];
let appShell: HTMLElement | null = null;

/** Makes the shell inert while a dialog is open; set directly (not through React state), so it is already
 * undone when the closing dialog hands focus back to its opener, which an inert element could not take. */
function syncShellInert(): void {
  if (appShell !== null) {
    appShell.inert = openDialogs.length > 0;
  }
}

/** Registers the element that wraps the routed app (null when it unmounts); toasts and dialogs live outside it. */
export function registerAppShell(element: HTMLElement | null): void {
  appShell = element;
  syncShellInert();
}

export function pushDialog(dialog: HTMLElement): void {
  openDialogs.push(dialog);
  syncShellInert();
}

/** Removes a dialog that closed, wherever it sits in the stack. */
export function removeDialog(dialog: HTMLElement): void {
  const index = openDialogs.lastIndexOf(dialog);
  if (index !== -1) {
    openDialogs.splice(index, 1);
    syncShellInert();
  }
}

export function isTopDialog(dialog: HTMLElement): boolean {
  return openDialogs.at(-1) === dialog;
}
