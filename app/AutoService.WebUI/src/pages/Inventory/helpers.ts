/** Inventory page helpers: search normalization, validation mapping, form-state types, and the one permitted gross preview. */

import { DEFAULT_VAT_RATE_PERCENT } from '../../types/catalog/catalog.types';
import type { ServerFieldErrors } from '../../utils/serverValidation';

/** Mode for the part/labor-type create/edit modal. */
export type CatalogModalMode = 'create' | 'edit';

/** Which catalog entity a delete confirmation or form targets. */
export type CatalogItemKind = 'part' | 'laborType';

/** Part form state used by the create/edit modal. */
export interface PartFormState {
  partNumber: string;
  name: string;
  netUnitPrice: string;
  vatRatePercent: number;
}

/** Labor type form state used by the create/edit modal. */
export interface LaborTypeFormState {
  code: string;
  name: string;
  hourlyNetRate: string;
  vatRatePercent: number;
}

/** Delete-confirmation target shared by both catalog entity kinds. */
export interface DeleteCatalogItemTarget {
  kind: CatalogItemKind;
  id: number;
  name: string;
  identifier: string;
}

/** Empty part form used when opening the create modal. */
export const EMPTY_PART_FORM: PartFormState = {
  partNumber: '',
  name: '',
  netUnitPrice: '',
  vatRatePercent: DEFAULT_VAT_RATE_PERCENT,
};

/** Empty labor type form used when opening the create modal. */
export const EMPTY_LABOR_TYPE_FORM: LaborTypeFormState = {
  code: '',
  name: '',
  hourlyNetRate: '',
  vatRatePercent: DEFAULT_VAT_RATE_PERCENT,
};

/** Removes accents and lowercases input to support accent-insensitive search. */
export function normalizeCatalogSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Returns true when the server field-error dictionary has at least one non-empty entry. */
export function hasServerFieldErrors(errors: ServerFieldErrors): boolean {
  return Object.values(errors).some((messages) => messages.length > 0);
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
