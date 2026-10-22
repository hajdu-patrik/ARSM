/** Company data form fields of Settings: the draft laid over the stored letterhead, the per-field error map
 * and the length limits that mirror the backend. */

import type { CompanyProfileDto } from '../../types/admin/companyProfile.types';

/** Fields of the company data form, in letterhead order. */
export const COMPANY_FIELD_NAMES = ['name', 'postalCode', 'city', 'addressLine', 'taxNumber', 'phoneNumber', 'email'] as const;

export type CompanyFieldName = (typeof COMPANY_FIELD_NAMES)[number];

/** Maximum length of every field, equal to the backend CompanyProfileLimits. */
export const COMPANY_FIELD_MAX_LENGTHS: Readonly<Record<CompanyFieldName, number>> = {
  name: 150,
  postalCode: 4,
  city: 50,
  addressLine: 150,
  taxNumber: 13,
  phoneNumber: 20,
  email: 150,
};

export type CompanyFieldValues = Readonly<Record<CompanyFieldName, string>>;

/** The fields the user edited since the profile was read; a field not listed shows the stored value. */
export type CompanyDraft = Readonly<Partial<Record<CompanyFieldName, string>>>;

/** The validation message key of every field, undefined while the field has none. */
export type CompanyFieldErrors = Readonly<Record<CompanyFieldName, string | undefined>>;

export const NO_COMPANY_FIELD_ERRORS: CompanyFieldErrors = {
  name: undefined,
  postalCode: undefined,
  city: undefined,
  addressLine: undefined,
  taxNumber: undefined,
  phoneNumber: undefined,
  email: undefined,
};

/** The stored text per field (blank for every field while the profile is unread). */
export function toCompanyFieldValues(profile: CompanyProfileDto | null): CompanyFieldValues {
  return {
    name: profile?.name ?? '',
    postalCode: profile?.postalCode ?? '',
    city: profile?.city ?? '',
    addressLine: profile?.addressLine ?? '',
    taxNumber: profile?.taxNumber ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
    email: profile?.email ?? '',
  };
}

/** The values the form shows: the stored text with the edited fields laid over it. */
export function applyCompanyDraft(baseline: CompanyFieldValues, draft: CompanyDraft): CompanyFieldValues {
  return { ...baseline, ...draft };
}

/** True when any shown value differs from the stored text. */
export function hasCompanyFieldChanges(baseline: CompanyFieldValues, values: CompanyFieldValues): boolean {
  return COMPANY_FIELD_NAMES.some((field) => values[field] !== baseline[field]);
}

/** The request body: every value trimmed. */
export function toCompanyProfileDto(values: CompanyFieldValues): CompanyProfileDto {
  return {
    name: values.name.trim(),
    addressLine: values.addressLine.trim(),
    postalCode: values.postalCode.trim(),
    city: values.city.trim(),
    taxNumber: values.taxNumber.trim(),
    phoneNumber: values.phoneNumber.trim(),
    email: values.email.trim(),
  };
}
