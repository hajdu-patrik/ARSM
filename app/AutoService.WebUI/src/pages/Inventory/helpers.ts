/** Inventory page helpers: validation mapping, field-error pinning, form-state types, and the one permitted gross preview. */

import { DEFAULT_VAT_RATE_PERCENT } from '../../types/catalog/catalog.types';

export type CatalogModalMode = 'create' | 'edit';

export type CatalogItemKind = 'part' | 'laborType';

/** Create/edit modal form state of both kinds: `identifier` is the part number or code, `rate` the net price or hourly rate. */
export interface CatalogFormState {
  identifier: string;
  name: string;
  rate: string;
  vatRatePercent: number;
}

export interface DeleteCatalogItemTarget {
  kind: CatalogItemKind;
  id: number;
  name: string;
  identifier: string;
}

export const EMPTY_CATALOG_FORM: CatalogFormState = {
  identifier: '',
  name: '',
  rate: '',
  vatRatePercent: DEFAULT_VAT_RATE_PERCENT,
};

/** Fields of the generic catalog form that can carry a validation message. */
export type CatalogFieldName = 'identifier' | 'name' | 'rate' | 'vatRate';

/** The i18n key of the validation message each field currently shows. */
export type CatalogFieldErrors = Partial<Record<CatalogFieldName, string>>;

/** The current value of every validated field as text, which a pinned message is compared with. */
export type CatalogFieldValues = Readonly<Record<CatalogFieldName, string>>;

export function readCatalogFieldValues(form: CatalogFormState): CatalogFieldValues {
  return { identifier: form.identifier, name: form.name, rate: form.rate, vatRate: String(form.vatRatePercent) };
}

/** A validation message together with the field and the value it was raised for. */
export interface PinnedCatalogFieldError {
  readonly field: CatalogFieldName;
  readonly messageKey: string;
  readonly value: string;
}

/** The catalog messages that concern exactly one field; the endpoints answer with one message, never a field dictionary. */
const CATALOG_MESSAGE_FIELDS: Readonly<Record<string, CatalogFieldName>> = {
  'inventory.errors.identifierTooLong': 'identifier',
  'inventory.errors.partNumberExists': 'identifier',
  'inventory.errors.codeExists': 'identifier',
  'inventory.errors.nameTooLong': 'name',
  'inventory.errors.invalidMoney': 'rate',
  'common.validation.invalidVatRate': 'vatRate',
};

/** Pins a message to the one field it concerns and the value that field holds, or returns null for a message about no field. */
export function pinCatalogFieldError(messageKey: string, values: CatalogFieldValues): PinnedCatalogFieldError | null {
  const field = CATALOG_MESSAGE_FIELDS[messageKey];

  return field === undefined ? null : { field, messageKey, value: values[field] };
}

/** The pinned message while its field still holds the value it was raised for, so editing the field clears it. */
export function currentCatalogFieldErrors(
  pinned: PinnedCatalogFieldError | null,
  values: CatalogFieldValues,
): CatalogFieldErrors {
  const errors: CatalogFieldErrors = {};

  if (pinned !== null && values[pinned.field] === pinned.value) {
    errors[pinned.field] = pinned.messageKey;
  }

  return errors;
}

/** Maps part/labor-type validation messages (from `Catalog/*.Mutations.cs`, `Validation/PricingValidation.cs`) to i18n keys. */
export function mapCatalogValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('partnumber and name are required') || normalized.includes('code and name are required')) {
    return 'common.validation.fieldRequired';
  }

  if (normalized.includes('part number is required') || normalized.includes('code is required')) {
    return 'common.validation.fieldRequired';
  }

  if (normalized.includes('partnumber must be at most') || normalized.includes('code must be at most')) {
    return 'inventory.errors.identifierTooLong';
  }

  if (normalized.includes('name must be at most')) {
    return 'inventory.errors.nameTooLong';
  }

  if (normalized.includes('a part with this part number already exists')) {
    return 'inventory.errors.partNumberExists';
  }

  if (normalized.includes('a labor type with this code already exists')) {
    return 'inventory.errors.codeExists';
  }

  if (normalized.includes('part not found')) {
    return 'inventory.errors.partNotFound';
  }

  if (normalized.includes('labor type not found')) {
    return 'inventory.errors.laborTypeNotFound';
  }

  if (normalized.includes('vat rate must be')) {
    return 'common.validation.invalidVatRate';
  }

  if (normalized.includes('amount must be at least')) {
    return 'inventory.errors.invalidMoney';
  }

  return 'inventory.errors.saveFailed';
}

/** Mirrors `Pricing/PricingCalculator.GrossUnitPrice` exactly: round(net * (1 + vat/100), 2); the only allowed client-side gross computation (CLAUDE.md). */
export function computeLiveGrossPreview(netAmount: number, vatRatePercent: number): number {
  if (Number.isNaN(netAmount)) {
    return 0;
  }

  return Math.round(netAmount * (1 + vatRatePercent / 100) * 100) / 100;
}
