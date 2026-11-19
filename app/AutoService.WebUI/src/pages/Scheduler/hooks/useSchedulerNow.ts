/** Page-level clock of the scheduler: the current time in ms, refreshed every minute while the tab is visible. */
import { useEffect, useState } from 'react';

const SCHEDULER_NOW_TICK_MS = 60 * 1000;

/** Returns the current time in ms, ticking every minute and on the tab becoming visible. */
export function useSchedulerNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };

    const intervalId = window.setInterval(refresh, SCHEDULER_NOW_TICK_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return now;
}
