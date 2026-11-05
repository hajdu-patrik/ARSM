/** Error mapping of a rejected password change: the server's field errors or its single detail, as message keys. */

import { isAxiosError } from 'axios';
import { hasErrorCode } from '../services/http/error-code';
import { resolveAttemptsExceededMessage } from './lockoutWait';
import {
  extractServerFieldErrors,
  hasServerFieldErrors,
  mapValidationMessageOrFallback,
  type ServerErrorBody,
  type ServerFieldErrors,
} from './serverValidation';

/** Generic failure message, used for a server message that has no mapping. */
const PASSWORD_CHANGE_FAILED_KEY = 'toast.passwordChangeFailed';

/** Toast key and values of a 429 lockout_active answer (the wait named when known), else null. */
export function extractLockoutToast(err: unknown): { key: string; values: Record<string, number> } | null {
  if (!hasErrorCode(err, 429, 'lockout_active')) {
    return null;
  }

  const message = resolveAttemptsExceededMessage(err);
  const minutes = 'minutes' in message ? message.minutes : 0;
  return { key: message.key, values: 'minutes' in message ? { minutes, count: minutes } : {} };
}

/** Normalizes password-related server field errors, routing unknown keys to NewPassword. */
function mapPasswordErrors(errors: ServerFieldErrors): ServerFieldErrors {
  const mapped: ServerFieldErrors = {};

  Object.entries(errors).forEach(([key, value]) => {
    const normalizedValues = value.map((message) => mapValidationMessageOrFallback(message, 'settings', PASSWORD_CHANGE_FAILED_KEY));

    if (key === 'CurrentPassword' || key === 'PasswordMismatch') {
      mapped.CurrentPassword = [...(mapped.CurrentPassword ?? []), ...normalizedValues];
    } else if (key === 'ConfirmNewPassword') {
      mapped.ConfirmNewPassword = [...(mapped.ConfirmNewPassword ?? []), ...normalizedValues];
    } else {
      mapped.NewPassword = [...(mapped.NewPassword ?? []), ...normalizedValues];
    }
  });

  return mapped;
}

/** Maps a password-change error to normalized field errors for 422/400 responses, else null. */
export function extractPasswordChangeErrors(err: unknown): ServerFieldErrors | null {
  if (!isAxiosError<ServerErrorBody>(err)) {
    return null;
  }

  const data = err.response?.data;
  const mappedFieldErrors = mapPasswordErrors(extractServerFieldErrors(data));

  if (hasServerFieldErrors(mappedFieldErrors)) {
    return mappedFieldErrors;
  }

  if (data?.detail) {
    return { Detail: [mapValidationMessageOrFallback(data.detail, 'settings', PASSWORD_CHANGE_FAILED_KEY)] };
  }

  return null;
}
