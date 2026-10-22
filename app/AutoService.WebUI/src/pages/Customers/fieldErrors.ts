/** Per-field validation messages of the customer and vehicle forms, and how a rejected save maps to them.
 * An error is pinned to the value it was raised for, so editing the field clears it without any extra state. */

import { isAxiosError } from 'axios';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  getServerFieldError,
  hasRequiredFieldError,
  hasServerFieldErrors,
  normalizeServerFieldErrors,
  type ServerErrorBody,
  type ServerFieldErrors,
} from '../../utils/serverValidation';

export const CUSTOMER_FIELD_NAMES = ['firstName', 'middleName', 'lastName', 'email', 'phoneNumber'] as const;

export const VEHICLE_FIELD_NAMES = [
  'licensePlate',
  'vin',
  'brand',
  'model',
  'year',
  'mileageKm',
  'enginePowerKw',
  'drivetrainType',
] as const;

export type CustomerFieldName = (typeof CUSTOMER_FIELD_NAMES)[number];
export type VehicleFieldName = (typeof VEHICLE_FIELD_NAMES)[number];

/** A message key together with the field value it was raised for. */
interface PinnedFieldError {
  readonly messageKey: string;
  readonly value: string;
}

/** The errors of the last failed submit, by field. */
export type PinnedFieldErrors<TField extends string> = Partial<Record<TField, PinnedFieldError>>;

/** The message keys that apply to the current form values, by field. */
export type FieldErrorKeys<TField extends string> = Partial<Record<TField, string>>;

/** Server conflicts carry no field name in their dictionary but concern exactly one customer field. */
export const CUSTOMER_MESSAGE_FIELDS: Readonly<Record<string, CustomerFieldName>> = {
  'customers.errors.emailExists': 'email',
  'customers.errors.phoneExists': 'phoneNumber',
};

/** Server conflicts carry no field name in their dictionary but concern exactly one vehicle field. */
export const VEHICLE_MESSAGE_FIELDS: Readonly<Record<string, VehicleFieldName>> = {
  'customers.errors.vehicleLicensePlateExists': 'licensePlate',
  'common.validation.vehicleVinInvalid': 'vin',
};

/** Pins the first message of every listed field to the value the field held when the form was submitted. */
export function pinFieldErrors<TField extends string>(
  errors: ServerFieldErrors,
  values: Readonly<Record<TField, string>>,
  fields: readonly TField[],
): PinnedFieldErrors<TField> {
  const pinned: PinnedFieldErrors<TField> = {};

  for (const field of fields) {
    const messageKey = getServerFieldError(errors, field);
    if (messageKey !== undefined) {
      pinned[field] = { messageKey, value: values[field] };
    }
  }

  return pinned;
}

/** Pins a message that names no field to the one field it concerns, if the message is a known conflict. */
function pinMessageField<TField extends string>(
  messageKey: string,
  messageFields: Readonly<Record<string, TField>>,
  values: Readonly<Record<TField, string>>,
): PinnedFieldErrors<TField> {
  const pinned: PinnedFieldErrors<TField> = {};
  const field = messageFields[messageKey];

  if (field !== undefined) {
    pinned[field] = { messageKey, value: values[field] };
  }

  return pinned;
}

/** Keeps the pinned errors whose field still holds the value they were raised for. */
export function currentFieldErrors<TField extends string>(
  pinned: PinnedFieldErrors<TField>,
  values: Readonly<Record<TField, string>>,
  fields: readonly TField[],
): FieldErrorKeys<TField> {
  const current: FieldErrorKeys<TField> = {};

  for (const field of fields) {
    const error = pinned[field];
    if (error !== undefined && error.value === values[field]) {
      current[field] = error.messageKey;
    }
  }

  return current;
}

/** How a form reads a rejected save: its message mapper, fallback key, fields and the conflicts that concern one field. */
export interface SaveErrorRules<TField extends string> {
  readonly mapMessage: (message: string) => string;
  readonly fallbackKey: string;
  readonly fields: readonly TField[];
  readonly messageFields: Readonly<Record<string, TField>>;
}

/** A rejected save: the key to toast, the errors to pin (null keeps the current ones) and the server field errors. */
export interface RejectedSave<TField extends string> {
  readonly messageKey: string;
  readonly pinned: PinnedFieldErrors<TField> | null;
  readonly fieldErrors: ServerFieldErrors | null;
}

/** Maps a rejected save to its message and pinned errors: a field dictionary first, else the detail message. */
export function resolveRejectedSave<TField extends string>(
  error: unknown,
  rules: SaveErrorRules<TField>,
  values: Readonly<Record<TField, string>>,
): RejectedSave<TField> {
  if (!isAxiosError<ServerErrorBody>(error)) {
    return { messageKey: rules.fallbackKey, pinned: null, fieldErrors: null };
  }

  const responseData = error.response?.data;
  const fieldErrors = normalizeServerFieldErrors(extractServerFieldErrors(responseData), rules.mapMessage);

  if (hasServerFieldErrors(fieldErrors)) {
    return {
      messageKey: getFirstFieldErrorMessage(fieldErrors) ?? rules.fallbackKey,
      pinned: pinFieldErrors(fieldErrors, values, rules.fields),
      fieldErrors,
    };
  }

  const messageKey = responseData?.detail ? rules.mapMessage(responseData.detail) : rules.fallbackKey;
  return { messageKey, pinned: pinMessageField(messageKey, rules.messageFields, values), fieldErrors: null };
}

/** Puts the saved value back into each listed field the user blanked and the server rejected as required. */
export function restoreRequiredFields<TField extends string, TForm extends Readonly<Record<TField, string>>>(
  form: TForm,
  snapshot: Readonly<Record<TField, string>>,
  errors: ServerFieldErrors,
  fields: readonly TField[],
): TForm {
  const restored: Partial<Record<TField, string>> = {};

  for (const field of fields) {
    if (!form[field].trim() && hasRequiredFieldError(errors, field)) {
      restored[field] = snapshot[field];
    }
  }

  return { ...form, ...restored };
}
