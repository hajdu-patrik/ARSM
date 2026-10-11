import type { CustomerListItem, UpdateCustomerRequest } from '../../../types/customers/customers.types';
import type { CustomerFormState } from '../page.types';

/** Trims the customer form into the request payload; blank optional fields become null. */
export function buildNormalizedCustomerPayload(form: CustomerFormState): UpdateCustomerRequest {
  return {
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim() || null,
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phoneNumber: form.phoneNumber.trim() || null,
  };
}

/** True when every required customer field has a value. */
export function hasRequiredCustomerFields(payload: UpdateCustomerRequest): boolean {
  return payload.firstName.length > 0
    && payload.lastName.length > 0
    && payload.email.length > 0;
}

/** True when at least one customer field has a value. */
export function hasAnyCustomerFieldValue(payload: UpdateCustomerRequest): boolean {
  return payload.firstName.length > 0
    || (payload.middleName?.length ?? 0) > 0
    || payload.lastName.length > 0
    || payload.email.length > 0
    || (payload.phoneNumber?.length ?? 0) > 0;
}

/** True when the payload differs from the customer snapshot the edit started from. */
export function hasCustomerUpdateChanges(
  snapshot: CustomerListItem,
  payload: UpdateCustomerRequest,
): boolean {
  return snapshot.firstName !== payload.firstName
    || (snapshot.middleName ?? null) !== payload.middleName
    || snapshot.lastName !== payload.lastName
    || snapshot.email !== payload.email
    || (snapshot.phoneNumber ?? null) !== payload.phoneNumber;
}
