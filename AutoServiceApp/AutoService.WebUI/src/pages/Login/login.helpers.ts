/**
 * Login parsing and error-resolution helpers.
 *
 * Normalizes email/phone identifiers and translates backend/transport
 * failures to stable i18n-friendly login error keys.
 * @module pages/Login/login.helpers
 */

import { isAxiosError, type AxiosError } from 'axios';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

interface ApiErrorPayload {
  readonly code?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly message?: string;
  readonly error?: string;
  readonly retryAfterSeconds?: number;
}

/** Discriminated login error model used by the login page UI. */
export type LoginError =
  | { key: 'login.invalidCredentials' }
  | { key: 'login.mechanicOnly' }
  | { key: 'login.identifierNotFound' }
  | { key: 'login.serverError500' }
  | { key: 'login.databaseUnavailable' }
  | { key: 'login.attemptsExceededWithDuration'; minutes: number }
  | { key: 'login.attemptsExceeded' }
  | { key: 'login.error' };

/** Parsed login identifier model for email or EU phone input. */
export type ParsedIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; phoneNumber: string }
  | { kind: 'invalid'; reason: 'format' | 'wrong_method_email' | 'wrong_method_phone' };

/** Identifier login mode currently selected by the user. */
export type LoginMethod = 'email' | 'phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCEPTED_EU_COUNTRY_CALLING_CODES = new Set([
  '43', '32', '359', '385', '357', '420', '45', '372', '358', '33', '49', '30', '36', '354', '353', '39',
  '371', '423', '370', '352', '356', '31', '47', '48', '351', '40', '421', '386', '34', '46', '44',
  '355', '376', '374', '994', '375', '387', '298', '995', '350', '383', '389', '373', '377', '382',
  '7', '378', '381', '41', '90', '380', '379',
]);

/** Heuristic check: does the input look like a phone number (not an email)? */
function looksLikePhone(value: string): boolean {
  const stripped = value.replaceAll(/\D/g, '');
  if (!stripped || stripped.length < 7) return false;
  return value.trim().startsWith('+') || stripped.length >= 7;
}

function parseEmailIdentifier(value: string): ParsedIdentifier {
  if (!value.includes('@') && looksLikePhone(value)) {
    return { kind: 'invalid', reason: 'wrong_method_phone' };
  }

  if (!EMAIL_REGEX.test(value)) {
    return { kind: 'invalid', reason: 'format' };
  }

  return {
    kind: 'email',
    email: value.toLowerCase(),
  };
}

function parsePhoneIdentifier(value: string): ParsedIdentifier {
  if (value.includes('@')) {
    return { kind: 'invalid', reason: 'wrong_method_email' };
  }

  // Use libphonenumber-js with HU as default country for local numbers.
  try {
    const parsed = parsePhoneNumberFromString(value, 'HU');
    if (parsed && parsed.isValid() && ACCEPTED_EU_COUNTRY_CALLING_CODES.has(parsed.countryCallingCode)) {
      return { kind: 'phone', phoneNumber: parsed.number };
    }
  } catch { /* fall through to invalid */ }

  return { kind: 'invalid', reason: 'format' };
}

/** Parses and validates a user-provided identifier by selected login method. */
export function parseIdentifierByMethod(value: string, method: LoginMethod): ParsedIdentifier {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { kind: 'invalid', reason: 'format' };
  }

  return method === 'email'
    ? parseEmailIdentifier(trimmedValue)
    : parsePhoneIdentifier(trimmedValue);
}

function parseRetryAfterSeconds(err: AxiosError<ApiErrorPayload>): number | null {
  const payloadRetryAfter = err.response?.data?.retryAfterSeconds;
  if (typeof payloadRetryAfter === 'number' && Number.isFinite(payloadRetryAfter) && payloadRetryAfter > 0) {
    return Math.floor(payloadRetryAfter);
  }

  const retryAfterHeader = err.response?.headers?.['retry-after'];

  if (typeof retryAfterHeader === 'string') {
    const parsedSeconds = Number.parseInt(retryAfterHeader, 10);
    if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
      return parsedSeconds;
    }

    const parsedDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(parsedDate)) {
      const deltaSeconds = Math.ceil((parsedDate - Date.now()) / 1000);
      if (deltaSeconds > 0) {
        return deltaSeconds;
      }
    }
  }

  return null;
}

function toAttemptsExceededError(retryAfterSeconds: number | null): LoginError {
  if (retryAfterSeconds === null) {
    return { key: 'login.attemptsExceeded' };
  }

  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

  return {
    key: 'login.attemptsExceededWithDuration',
    minutes,
  };
}

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function buildNormalizedErrorText(
  responseData: ApiErrorPayload | undefined,
  message: string | undefined,
): string {
  return [
    responseData?.code,
    responseData?.title,
    responseData?.detail,
    responseData?.message,
    responseData?.error,
    message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** Maps unknown login errors to user-facing login error keys. */
export function resolveLoginError(err: unknown): LoginError {
  if (!isAxiosError<ApiErrorPayload>(err)) {
    return { key: 'login.databaseUnavailable' };
  }

  const status = err.response?.status;
  const responseData = err.response?.data;

  const normalizedErrorText = buildNormalizedErrorText(responseData, err.message);

  if (status === 429 || includesAny(normalizedErrorText, ['lockout', 'too many attempts', 'rate limit'])) {
    return toAttemptsExceededError(parseRetryAfterSeconds(err));
  }

  if (status === 500 || normalizedErrorText.includes('500')) {
    return { key: 'login.serverError500' };
  }

  if (includesAny(normalizedErrorText, ['database', 'db', 'npgsql', 'connection', 'socket', 'econnrefused', 'network error', 'failed to fetch'])) {
    return { key: 'login.databaseUnavailable' };
  }

  if (status === 404 || includesAny(normalizedErrorText, ['identifier_not_found', 'does not exist', 'not found'])) {
    return { key: 'login.identifierNotFound' };
  }

  if (status === 403 || includesAny(normalizedErrorText, ['mechanic_only_login', 'only mechanics'])) {
    return { key: 'login.mechanicOnly' };
  }

  if (status === 401) {
    return { key: 'login.invalidCredentials' };
  }

  return { key: 'login.error' };
}
