/** One appointment mutation: the service call, the scheduler cache write and invalidation, and the toasts. */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  invalidateAppointmentReadCaches,
  writeAppointmentToSchedulerCache,
  type AppointmentMutationCacheOptions,
} from '../../../services/cache/appointmentQueryCache';
import { queryKeys } from '../../../services/cache/queryKeys';
import { isVersionConflict } from '../../../services/http/error-code';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';

/** Toast text of a failed mutation: one i18n key, or a mapper that picks the key from the error. */
type FailureKey = string | ((error: unknown) => string);

/** Code of the 409 that refuses a status change or update carrying a stale version. */
const VERSION_CONFLICT_CODE = 'appointment_version_conflict';

/** What differs between the appointment mutations. */
interface AppointmentMutationSpec<TVariables> {
  /** Calls the service and resolves with the changed appointment. */
  readonly mutationFn: (variables: TVariables) => Promise<AppointmentDto>;
  /** i18n key of the success toast. */
  readonly successKey: string;
  /** Failure toast, or {@code null} when the caller reports the failure itself. */
  readonly failureKey: FailureKey | null;
  /** Related read caches to invalidate beyond the scheduler lists. */
  readonly cacheOptions?: (variables: TVariables) => AppointmentMutationCacheOptions;
}

/** Builds a mutation that writes its result into the scheduler caches, refreshes the affected reads and toasts;
 * a stale-version conflict toasts its own message and reloads the scheduler reads instead. */
export function useAppointmentMutation<TVariables>({
  mutationFn,
  successKey,
  failureKey,
  cacheOptions,
}: AppointmentMutationSpec<TVariables>) {
  const queryClient = useQueryClient();
  const scope = useAuthQueryScope();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  return useMutation({
    mutationFn,
    onSuccess: (appointment, variables) => {
      if (scope !== null) {
        writeAppointmentToSchedulerCache(queryClient, scope, appointment);
        invalidateAppointmentReadCaches(queryClient, scope, appointment, cacheOptions?.(variables));
      }

      showSuccessToast(successKey);
    },
    onError: (error) => {
      if (isVersionConflict(error, VERSION_CONFLICT_CODE)) {
        showErrorToast('scheduler.detail.versionConflict');

        if (scope !== null) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.scheduler.root(scope) });
        }

        return;
      }

      if (failureKey !== null) {
        showErrorToast(typeof failureKey === 'string' ? failureKey : failureKey(error));
      }
    },
  });
}
