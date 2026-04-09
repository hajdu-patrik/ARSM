export type ServerFieldErrors = Record<string, string[]>;

export type ValidationContext = 'admin' | 'settings';

function toCapitalized(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getServerFieldError(errors: ServerFieldErrors, field: string): string | undefined {
  const variants = [field, field.toLowerCase(), toCapitalized(field)];

  for (const variant of variants) {
    const values = errors[variant];
    if (values?.length) {
      return values[0];
    }
  }

  return undefined;
}

export function extractServerFieldErrors(
  data: { errors?: ServerFieldErrors; detail?: string } | undefined,
): ServerFieldErrors {
  return data?.errors ?? {};
}

export function mapValidationMessageToKey(message: string, context: ValidationContext): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('already exists') && normalized.includes('email')) {
    return `${context}.errors.emailExists`;
  }

  if (normalized.includes('already exists') && normalized.includes('phone')) {
    return `${context}.errors.phoneExists`;
  }

  if (normalized.includes('email must be a valid email address')) {
    return `${context}.errors.invalidEmail`;
  }

  if (normalized.includes('phone number must be a valid hungarian number')) {
    return `${context}.errors.invalidPhone`;
  }

  if (normalized.includes('may only contain letters and hyphens')) {
    return `${context}.errors.invalidName`;
  }

  if (context === 'settings') {
    if (normalized.includes('current password is invalid') || normalized.includes('password is incorrect')) {
      return 'settings.errors.currentPasswordInvalid';
    }

    if (normalized.includes('passwords do not match')) {
      return 'settings.passwordsDoNotMatch';
    }
  }

  return message;
}

export function mapAdminValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'admin');
}

export function mapSettingsValidationMessageToKey(message: string): string {
  return mapValidationMessageToKey(message, 'settings');
}

export function normalizeServerFieldErrors(
  errors: ServerFieldErrors,
  mapMessage: (message: string) => string,
): ServerFieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([key, values]) => [
      key,
      values.map((value) => mapMessage(value)),
    ]),
  );
}
