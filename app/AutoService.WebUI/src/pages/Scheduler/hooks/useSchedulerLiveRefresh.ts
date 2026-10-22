/** Live refresh of the scheduler reads: a change announced by the server invalidates the current view,
 * because an appointment can move between months, so nothing is patched locally. */

import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile/profile-picture-live.service';
import {
  APPOINTMENT_UPDATED_EVENT,
  isAppointmentLiveConnected,
  startAppointmentLiveUpdates,
  subscribeToAppointmentLiveConnection,
} from '../../../services/scheduler/appointment-live.service';
import { queryKeys, type AuthQueryScope } from '../../../services/cache/queryKeys';

/** Whether the appointment live stream is open right now; while it is, its events keep the reads fresh. */
export function useIsAppointmentLiveConnected(): boolean {
  return useSyncExternalStore(subscribeToAppointmentLiveConnection, isAppointmentLiveConnected);
}

/** Opens the appointment live stream while mounted and refetches the active scheduler reads on each event. */
export function useSchedulerLiveRefresh(scope: AuthQueryScope | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scope === null) {
      return undefined;
    }

    const refreshCurrentView = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.root(scope) });
    };

    const stopAppointmentLiveUpdates = startAppointmentLiveUpdates();
    globalThis.addEventListener(APPOINTMENT_UPDATED_EVENT, refreshCurrentView);
    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, refreshCurrentView);

    return () => {
      globalThis.removeEventListener(APPOINTMENT_UPDATED_EVENT, refreshCurrentView);
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, refreshCurrentView);
      stopAppointmentLiveUpdates();
    };
  }, [queryClient, scope]);
}
