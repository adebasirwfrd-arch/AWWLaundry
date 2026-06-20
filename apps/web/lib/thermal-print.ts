/**
 * Auto-print thermal receipt (80mm) via browser print dialog.
 * CSS in globals.css hides everything except .thermal-receipt during print.
 */

let printing = false;

export function printThermalReceipt(delayMs = 400): Promise<void> {
  if (printing) return Promise.resolve();
  printing = true;

  return new Promise((resolve) => {
    window.setTimeout(() => {
      try {
        window.print();
      } finally {
        window.setTimeout(() => {
          printing = false;
          resolve();
        }, 500);
      }
    }, delayMs);
  });
}

/** Listen for afterprint to chain actions (e.g. reset UI). */
export function onAfterPrint(fn: () => void) {
  const handler = () => {
    fn();
    window.removeEventListener('afterprint', handler);
  };
  window.addEventListener('afterprint', handler);
}
