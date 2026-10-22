/** Company data validation: the client-side rules that mirror the backend and the mapping of server 400 field errors. */

import { isAxiosError } from 'axios';
import { parseIdentifierByMethod } from '../Login/login.helpers';
import { getServerFieldError, mapSettingsValidationMessageToKey, type ServerFieldErrors } from '../../utils/serverValidation';
import {
  COMPANY_FIELD_MAX_LENGTHS,
  COMPANY_FIELD_NAMES,
  NO_COMPANY_FIELD_ERRORS,
  type CompanyFieldErrors,
  type CompanyFieldName,
  type CompanyFieldValues,
} from './companyProfileFields';

const REQUIRED_KEY = 'common.validation.fieldRequired';
const TOO_LONG_KEY = 'settings.company.errors.tooLong';
const TAX_NUMBER_KEY = 'settings.company.errors.taxNumberInvalid';
const POSTAL_CODE_KEY = 'settings.company.errors.postalCodeInvalid';
const INVALID_EMAIL_KEY = 'common.validation.invalidEmail';
const INVALID_PHONE_KEY = 'common.validation.invalidPhone';

const TAX_NUMBER_PATTERN = /^\d{8}-\d-\d{2}$/;
const POSTAL_CODE_PATTERN = /^\d{4}$/;

type MutableCompanyFieldErrors = { -readonly [Field in CompanyFieldName]: string | undefined };

/** Message key for the format rule of a field, or undefined when the trimmed value satisfies it. */
async function getFormatErrorKey(field: CompanyFieldName, value: string): Promise<string | undefined> {
  if (field === 'taxNumber') {
    return TAX_NUMBER_PATTERN.test(value) ? undefined : TAX_NUMBER_KEY;
  }

  if (field === 'postalCode') {
    return POSTAL_CODE_PATTERN.test(value) ? undefined : POSTAL_CODE_KEY;
  }

  if (field === 'email') {
    return (await parseIdentifierByMethod(value, 'email')).kind === 'invalid' ? INVALID_EMAIL_KEY : undefined;
  }

  if (field === 'phoneNumber') {
    return (await parseIdentifierByMethod(value, 'phone')).kind === 'invalid' ? INVALID_PHONE_KEY : undefined;
  }

  return undefined;
}

/** Message key of the first broken rule of one field (required, length, format), undefined when it is valid. */
async function validateCompanyField(field: CompanyFieldName, rawValue: string): Promise<string | undefined> {
  const value = rawValue.trim();
  if (value === '') {
    return REQUIRED_KEY;
  }

  if (value.length > COMPANY_FIELD_MAX_LENGTHS[field]) {
    return TOO_LONG_KEY;
  }

  return getFormatErrorKey(field, value);
}

/** Validates every field; the result holds a message key per broken field. */
export async function validateCompanyValues(values: CompanyFieldValues): Promise<CompanyFieldErrors> {
  const messages = await Promise.all(COMPANY_FIELD_NAMES.map((field) => validateCompanyField(field, values[field])));
  const errors: MutableCompanyFieldErrors = { ...NO_COMPANY_FIELD_ERRORS };
  COMPANY_FIELD_NAMES.forEach((field, index) => {
    errors[field] = messages[index];
  });

  return errors;
}

export function hasCompanyFieldErrors(errors: CompanyFieldErrors): boolean {
  return COMPANY_FIELD_NAMES.some((field) => errors[field] !== undefined);
}

/** Fallback message key of a server message that no shared mapping knows, by the field it concerns. */
function getFallbackKey(field: CompanyFieldName, message: string): string {
  if (message.toLowerCase().includes('at most')) {
    return TOO_LONG_KEY;
  }

  if (field === 'taxNumber') {
    return TAX_NUMBER_KEY;
  }

  if (field === 'postalCode') {
    return POSTAL_CODE_KEY;
  }

  if (field === 'email') {
    return INVALID_EMAIL_KEY;
  }

  return field === 'phoneNumber' ? INVALID_PHONE_KEY : TOO_LONG_KEY;
}

/** Maps the field errors of a rejected save (400) to one message key per field; null when the error names no field. */
export function extractCompanySaveErrors(error: unknown): CompanyFieldErrors | null {
  if (!isAxiosError<{ errors?: ServerFieldErrors }>(error)) {
    return null;
  }

  const serverErrors = error.response?.data.errors ?? {};
  const mapped: MutableCompanyFieldErrors = { ...NO_COMPANY_FIELD_ERRORS };
  for (const field of COMPANY_FIELD_NAMES) {
    const message = getServerFieldError(serverErrors, field);
    if (message !== undefined) {
      const key = mapSettingsValidationMessageToKey(message);
      mapped[field] = key.startsWith('common.validation.') ? key : getFallbackKey(field, message);
    }
  }

  return hasCompanyFieldErrors(mapped) ? mapped : null;
}

/** The message key of the first field that has one, in letterhead order. */
export function getFirstCompanyErrorKey(errors: CompanyFieldErrors): string | undefined {
  return COMPANY_FIELD_NAMES.map((field) => errors[field]).find((message) => message !== undefined);
}
