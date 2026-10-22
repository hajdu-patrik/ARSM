/** Login parsing and error-resolution helpers: normalizes identifiers, maps backend/transport failures to i18n keys. */

import { isAxiosError, type AxiosError } from 'axios';
import { logError } from '../../utils/devLog';

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

/** Why an identifier is refused: left empty, the wrong shape, or typed into the other login method. */
export type InvalidIdentifierReason = 'required' | 'format' | 'wrong_method_email' | 'wrong_method_phone';

/** Parsed login identifier model for email or EU phone input. */
export type ParsedIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; phoneNumber: string }
  | { kind: 'invalid'; reason: InvalidIdentifierReason };

/** Identifier login mode currently selected by the user. */
export type LoginMethod = 'email' | 'phone';

/** Form fields of the login page that can carry a validation message. */
type LoginFieldName = 'identifier' | 'password';

/** The validation message key of every field, undefined while the field has none. */
export type LoginFieldErrors = Readonly<Record<LoginFieldName, string | undefined>>;

export const NO_LOGIN_FIELD_ERRORS: LoginFieldErrors = { identifier: undefined, password: undefined };

const REQUIRED_FIELD_KEY = 'common.validation.fieldRequired';

const IDENTIFIER_ERROR_KEYS: Readonly<Record<InvalidIdentifierReason, string>> = {
  required: REQUIRED_FIELD_KEY,
  format: 'login.invalidFormat',
  wrong_method_email: 'login.wrongMethodEmailInPhone',
  wrong_method_phone: 'login.wrongMethodPhoneInEmail',
};

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

/** Email mode: refuses a phone-shaped value as the wrong method, otherwise checks and lowercases the address. */
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

type PhoneLibrary = typeof import('libphonenumber-js');

/** The phone number library, once requested; a failed load is dropped so the next request imports it again. */
let phoneLibraryPromise: Promise<PhoneLibrary> | null = null;

/** Imports libphonenumber-js on first use, which keeps its metadata out of the login chunk until phone mode needs it. */
function loadPhoneLibrary(): Promise<PhoneLibrary> {
  phoneLibraryPromise ??= import('libphonenumber-js').catch((error: unknown) => {
    phoneLibraryPromise = null;
    throw error;
  });

  return phoneLibraryPromise;
}

/** Starts loading the phone number library early (when phone mode is chosen); a failure is logged and retried at submit. */
export function preloadPhoneLibrary(): void {
  loadPhoneLibrary().catch((error: unknown) => {
    logError('login.phoneLibrary', error);
  });
}

/** Phone mode: refuses an email as the wrong method, otherwise accepts a valid number of an accepted country. */
async function parsePhoneIdentifier(value: string): Promise<ParsedIdentifier> {
  if (value.includes('@')) {
    return { kind: 'invalid', reason: 'wrong_method_email' };
  }

  const { parsePhoneNumberFromString } = await loadPhoneLibrary();

  // Use libphonenumber-js with HU as default country for local numbers.
  try {
    const parsed = parsePhoneNumberFromString(value, 'HU');
    if (parsed && parsed.isValid() && ACCEPTED_EU_COUNTRY_CALLING_CODES.has(parsed.countryCallingCode)) {
      return { kind: 'phone', phoneNumber: parsed.number };
    }
  } catch { /* fall through to invalid */ }

  return { kind: 'invalid', reason: 'format' };
}

/** Parses and validates a user-provided identifier by selected login method; phone mode awaits the lazy phone library. */
export async function parseIdentifierByMethod(value: string, method: LoginMethod): Promise<ParsedIdentifier> {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { kind: 'invalid', reason: 'required' };
  }

  return method === 'email'
    ? parseEmailIdentifier(trimmedValue)
    : await parsePhoneIdentifier(trimmedValue);
}

/** The message key explaining why an identifier was refused. */
export function getIdentifierErrorKey(reason: InvalidIdentifierReason): string {
  return IDENTIFIER_ERROR_KEYS[reason];
}

/** Validates the whole form at submit time: the parsed identifier and a non-blank password. */
export function collectLoginFieldErrors(identifier: ParsedIdentifier, password: string): LoginFieldErrors {
  return {
    identifier: identifier.kind === 'invalid' ? getIdentifierErrorKey(identifier.reason) : undefined,
    password: password.trim().length === 0 ? REQUIRED_FIELD_KEY : undefined,
  };
}

/** True when at least one field carries a validation message. */
export function hasLoginFieldErrors(errors: LoginFieldErrors): boolean {
  return errors.identifier !== undefined || errors.password !== undefined;
}

/** Seconds until the next attempt, from the payload or the `Retry-After` header (seconds or date), else null. */
function parseRetryAfterSeconds(err: AxiosError<ApiErrorPayload>): number | null {
  const body = err.response?.data;
  const payloadRetryAfter = body?.retryAfterSeconds;
  if (typeof payloadRetryAfter === 'number' && Number.isFinite(payloadRetryAfter) && payloadRetryAfter > 0) {
    return Math.floor(payloadRetryAfter);
  }

  // Axios types a header lookup as `any`; unknown makes the typeof checks below do the narrowing.
  const retryAfterHeader: unknown = err.response?.headers['retry-after'];

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

/** The lockout error, carrying the wait in whole minutes (at least one) when the server named it. */
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

/** Every text field of the error body plus the transport message, joined and lowercased for keyword matching. */
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
