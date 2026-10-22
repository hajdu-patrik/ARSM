/** Profile form fields of Settings: the draft laid over the server profile, the per-field error map
 * and the lookup of which server message belongs to which field. */

import type { ProfileData } from '../../types/profile/profile.types';
import { getFieldMessageKey } from '../../utils/serverValidation';
import type { FieldErrors } from './types';

/** Fields of the personal-information form. */
export const PROFILE_FIELD_NAMES = ['firstName', 'middleName', 'lastName', 'email', 'phoneNumber'] as const;

export type ProfileFieldName = (typeof PROFILE_FIELD_NAMES)[number];

/** Fields the server refuses to leave blank; a blank one is restored from the profile when a save fails. */
export const REQUIRED_PROFILE_FIELDS: readonly ProfileFieldName[] = ['firstName', 'lastName', 'email'];

/** The text of every field. */
export type ProfileFieldValues = Readonly<Record<ProfileFieldName, string>>;

/** The fields the user edited since the profile was read; a field not listed shows the server value. */
export type ProfileDraft = Readonly<Partial<Record<ProfileFieldName, string>>>;

/** The validation message key of every field, undefined while the field has none. */
export type ProfileFieldErrors = Readonly<Record<ProfileFieldName, string | undefined>>;

export const NO_PROFILE_FIELD_ERRORS: ProfileFieldErrors = {
  firstName: undefined,
  middleName: undefined,
  lastName: undefined,
  email: undefined,
  phoneNumber: undefined,
};

/** Conflicts arrive as a message without a field name but concern exactly one field. */
const MESSAGE_FIELDS: Readonly<Record<string, ProfileFieldName>> = {
  'common.validation.emailExists': 'email',
  'common.validation.phoneExists': 'phoneNumber',
};

/** The profile's own text per field (blank for an absent optional value, and for every field while it is unread). */
export function toProfileFieldValues(profile: ProfileData | null): ProfileFieldValues {
  return {
    firstName: profile?.firstName ?? '',
    middleName: profile?.middleName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
  };
}

/** The values the form shows: the profile's own text with the edited fields laid over it. */
export function applyProfileDraft(baseline: ProfileFieldValues, draft: ProfileDraft): ProfileFieldValues {
  return { ...baseline, ...draft };
}

/** True when any shown value differs from the profile's own text. */
export function hasProfileFieldChanges(baseline: ProfileFieldValues, values: ProfileFieldValues): boolean {
  return PROFILE_FIELD_NAMES.some((field) => values[field] !== baseline[field]);
}

/** The draft without the given fields, which then show the profile's own text again. */
export function withoutDraftFields(draft: ProfileDraft, fields: readonly ProfileFieldName[]): ProfileDraft {
  const remaining: { -readonly [Field in ProfileFieldName]?: string } = {};

  for (const field of PROFILE_FIELD_NAMES) {
    const value = draft[field];
    if (value !== undefined && !fields.includes(field)) {
      remaining[field] = value;
    }
  }

  return remaining;
}

/** The field-level message of a field: its own entry, or a conflict message that names no field but concerns this one. */
function getProfileFieldMessage(errors: FieldErrors, field: ProfileFieldName): string | undefined {
  const ownMessage = getFieldMessageKey(errors, field);
  if (ownMessage !== undefined) {
    return ownMessage;
  }

  const detailMessage = getFieldMessageKey(errors, 'detail');
  return detailMessage !== undefined && MESSAGE_FIELDS[detailMessage] === field ? detailMessage : undefined;
}

/** The message of every field in a failed save, leaving out the fields that were restored instead. */
export function pickProfileFieldErrors(errors: FieldErrors, restored: readonly ProfileFieldName[]): ProfileFieldErrors {
  const messageFor = (field: ProfileFieldName) => (restored.includes(field) ? undefined : getProfileFieldMessage(errors, field));

  return {
    firstName: messageFor('firstName'),
    middleName: messageFor('middleName'),
    lastName: messageFor('lastName'),
    email: messageFor('email'),
    phoneNumber: messageFor('phoneNumber'),
  };
}
