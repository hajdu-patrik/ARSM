import { isAxiosError, type AxiosError } from 'axios';

interface ApiErrorPayload {
  readonly code?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly message?: string;
  readonly error?: string;
  readonly retryAfterSeconds?: number;
}

export type LoginError =
  | { key: 'login.invalidCredentials' }
  | { key: 'login.mechanicOnly' }
  | { key: 'login.identifierNotFound' }
  | { key: 'login.serverError500' }
  | { key: 'login.databaseUnavailable' }
  | { key: 'login.attemptsExceededWithDuration'; minutes: number }
  | { key: 'login.attemptsExceeded' }
  | { key: 'login.error' };

export type ParsedIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; phoneNumber: string }
  | { kind: 'invalid'; reason: 'format' | 'wrong_method_email' | 'wrong_method_phone' };

export type LoginMethod = 'email' | 'phone';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_MOBILE_PREFIXES = new Set(['20', '21', '30', '31', '50', '70']);
const ALLOWED_GEOGRAPHIC_PREFIXES = new Set([
  '22', '23', '24', '25', '26', '27', '28', '29',
  '32', '33', '34', '35', '36', '37',
  '42', '44', '45', '46', '47', '48', '49',
  '52', '53', '54', '56', '57', '59',
  '62', '63', '66', '68', '69',
  '72', '73', '74', '75', '76', '77', '78', '79',
  '82', '83', '84', '85', '87', '88', '89',
  '92', '93', '94', '95', '96', '99',
]);

function isValidHungarianNationalNumber(nationalDigits: string): boolean {
  if (!/^\d+$/.test(nationalDigits)) {
    return false;
  }

  // Budapest landline: 1 + 7 digits.
  if (nationalDigits.startsWith('1')) {
    return nationalDigits.length === 8;
  }

  if (nationalDigits.length < 8) {
    return false;
  }

  const twoDigitPrefix = nationalDigits.slice(0, 2);

  // Mobile/nomadic ranges: 2-digit prefix + 7 digits.
  if (ALLOWED_MOBILE_PREFIXES.has(twoDigitPrefix)) {
    return nationalDigits.length === 9;
  }

  // Geographic ranges: 2-digit area code + 6 digits.
  if (ALLOWED_GEOGRAPHIC_PREFIXES.has(twoDigitPrefix)) {
    return nationalDigits.length === 8;
  }

  return false;
}

function looksLikeHungarianPhone(value: string): boolean {
  const compactValue = value.replaceAll(/\D/g, '');

  if (!compactValue) {
    return false;
  }

  if (compactValue.startsWith('36') ||
    compactValue.startsWith('06') ||
    compactValue.startsWith('0036')) {
    return true;
  }

  // Also treat local Hungarian national format (for example: 301112233) as phone-like.
  return isValidHungarianNationalNumber(compactValue);
}

function parseEmailIdentifier(value: string): ParsedIdentifier {
  if (!value.includes('@') && looksLikeHungarianPhone(value)) {
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

  const compactValue = value.replaceAll(/\D/g, '');
  if (!compactValue) {
    return { kind: 'invalid', reason: 'format' };
  }

  let normalizedValue = compactValue;

  if (normalizedValue.startsWith('00')) {
    normalizedValue = normalizedValue.slice(2);
  }

  if (normalizedValue.startsWith('06')) {
    normalizedValue = `36${normalizedValue.slice(2)}`;
  }

  if (!normalizedValue.startsWith('36')) {
    if (!isValidHungarianNationalNumber(normalizedValue)) {
      return { kind: 'invalid', reason: 'format' };
    }

    normalizedValue = `36${normalizedValue}`;
  }

  const nationalDigits = normalizedValue.slice(2);
  if (!isValidHungarianNationalNumber(nationalDigits)) {
    return { kind: 'invalid', reason: 'format' };
  }

  return {
    kind: 'phone',
    phoneNumber: `36${nationalDigits}`,
  };
}

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
