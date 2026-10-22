/** Admin password-reset flow of the mechanic roster: the chosen mechanic, the temporary password, the request and its toasts. */
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { adminService, type MechanicListItem } from '../../../services/admin/admin.service';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  isFieldMessageKey,
  mapValidationMessageOrFallback,
  normalizeServerFieldErrors,
  type ServerErrorBody,
} from '../../../utils/serverValidation';

/** External dependencies for the password-reset hook. */
interface UseMechanicPasswordResetParams {
  readonly showErrorToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
  readonly showSuccessToast: (messageKey: string, messageValues?: Record<string, string | number>) => string;
}

/** Variables of the reset mutation. */
interface PasswordReset {
  readonly target: MechanicListItem;
  readonly temporaryPassword: string;
}

/** Maps a failed reset to the message that explains it: 403 forbidden, the first policy message of a 400, else a plain failure. */
function getResetErrorKey(error: unknown): string {
  if (!isAxiosError<ServerErrorBody>(error)) {
    return 'admin.passwordResetFailed';
  }

  if (error.response?.status === 403) {
    return 'admin.passwordResetForbidden';
  }

  const fieldErrors = normalizeServerFieldErrors(
    extractServerFieldErrors(error.response?.data),
    (message) => mapValidationMessageOrFallback(message, 'admin', 'admin.passwordResetFailed'),
  );

  return getFirstFieldErrorMessage(fieldErrors) ?? 'admin.passwordResetFailed';
}

/** Owns the reset dialog of the roster: opening it for a mechanic, the temporary password with its server message, the request. */
export function useMechanicPasswordReset({ showErrorToast, showSuccessToast }: UseMechanicPasswordResetParams) {
  const [resetTarget, setResetTarget] = useState<MechanicListItem | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);

  const { mutate: resetPassword, isPending: isResetting } = useMutation({
    mutationFn: ({ target, temporaryPassword: password }: PasswordReset) => adminService.resetMechanicPassword(target.personId, password),
    onSuccess: (_result, { target }) => {
      showSuccessToast('admin.passwordResetSuccess', { email: target.email });
      setResetTarget(null);
      setTemporaryPassword('');
    },
    onError: (error) => {
      const messageKey = getResetErrorKey(error);

      setPasswordError(isFieldMessageKey(messageKey) ? messageKey : undefined);
      showErrorToast(messageKey);
    },
  });

  const openPasswordReset = useCallback((mechanic: MechanicListItem) => {
    setTemporaryPassword('');
    setPasswordError(undefined);
    setResetTarget(mechanic);
  }, []);

  const closePasswordReset = useCallback(() => {
    if (!isResetting) {
      setResetTarget(null);
      setTemporaryPassword('');
    }
  }, [isResetting]);

  const changeTemporaryPassword = useCallback((value: string) => {
    setTemporaryPassword(value);
    setPasswordError(undefined);
  }, []);

  const confirmPasswordReset = useCallback(() => {
    if (resetTarget !== null) {
      resetPassword({ target: resetTarget, temporaryPassword });
    }
  }, [resetPassword, resetTarget, temporaryPassword]);

  return {
    resetTarget,
    temporaryPassword,
    passwordError,
    isResetting,
    openPasswordReset,
    closePasswordReset,
    changeTemporaryPassword,
    confirmPasswordReset,
  };
}
