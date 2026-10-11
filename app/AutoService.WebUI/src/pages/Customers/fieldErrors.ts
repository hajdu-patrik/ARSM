/** Per-field validation messages of the customer and vehicle forms. An error is pinned to the value
 * it was raised for, so editing the field clears it without any extra state. */

import { getServerFieldError, type ServerFieldErrors } from '../../utils/serverValidation';

/** Customer form fields that can carry a validation error. */
export const CUSTOMER_FIELD_NAMES = ['firstName', 'middleName', 'lastName', 'email', 'phoneNumber'] as const;

/** Vehicle form fields that can carry a validation error. */
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
export interface PinnedFieldError {
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
export function pinMessageField<TField extends string>(
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
