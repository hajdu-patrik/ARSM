/**
 * Catalog create/edit modal configuration: the element ids, i18n keys, and
 * field get/set accessors that differ between the part and labor-type
 * forms. The generic `CatalogFormModal` component renders identically for
 * both entities using one of these configs.
 * @module pages/Inventory/catalogForm.config
 */
import type { LaborTypeFormState, PartFormState } from './helpers';

/** A single identifier/rate field: element id, i18n keys, and form get/set accessors. */
export interface CatalogFormFieldConfig<TForm> {
  readonly elementId: string;
  readonly labelKey: string;
  readonly placeholderKey?: string;
  readonly testId?: string;
  readonly get: (form: TForm) => string;
  readonly set: (form: TForm, value: string) => TForm;
}

/** Per-entity configuration consumed by the generic `CatalogFormModal` component. */
export interface CatalogFormModalConfig<TForm extends { name: string; vatRatePercent: number }> {
  readonly formElementId: string;
  readonly createTitleKey: string;
  readonly editTitleKey: string;
  readonly nameElementId: string;
  readonly vatRateElementId: string;
  readonly grossPreviewElementId: string;
  readonly grossPreviewLabelKey: string;
  readonly identifier: CatalogFormFieldConfig<TForm>;
  readonly rate: CatalogFormFieldConfig<TForm>;
}

/** Part create/edit modal configuration. */
export const partCatalogFormConfig: CatalogFormModalConfig<PartFormState> = {
  formElementId: 'inventory-part-form',
  createTitleKey: 'inventory.createPart',
  editTitleKey: 'inventory.editPart',
  nameElementId: 'part-name',
  vatRateElementId: 'part-vat-rate',
  grossPreviewElementId: 'part-gross-price',
  grossPreviewLabelKey: 'inventory.grossUnitPricePreview',
  identifier: {
    elementId: 'part-number',
    labelKey: 'inventory.partNumber',
    placeholderKey: 'inventory.partNumberPlaceholder',
    get: (form) => form.partNumber,
    set: (form, value) => ({ ...form, partNumber: value.toUpperCase() }),
  },
  rate: {
    elementId: 'part-net-price',
    labelKey: 'inventory.netUnitPrice',
    placeholderKey: 'inventory.netUnitPricePlaceholder',
    get: (form) => form.netUnitPrice,
    set: (form, value) => ({ ...form, netUnitPrice: value }),
  },
};

/** Labor type create/edit modal configuration. */
export const laborTypeCatalogFormConfig: CatalogFormModalConfig<LaborTypeFormState> = {
  formElementId: 'inventory-labor-type-form',
  createTitleKey: 'inventory.createLaborType',
  editTitleKey: 'inventory.editLaborType',
  nameElementId: 'labor-type-name',
  vatRateElementId: 'labor-type-vat-rate',
  grossPreviewElementId: 'labor-type-gross-rate',
  grossPreviewLabelKey: 'inventory.grossHourlyRatePreview',
  identifier: {
    elementId: 'labor-type-code',
    labelKey: 'inventory.code',
    placeholderKey: 'inventory.codePlaceholder',
    get: (form) => form.code,
    set: (form, value) => ({ ...form, code: value.toUpperCase() }),
  },
  rate: {
    elementId: 'labor-type-hourly-rate',
    labelKey: 'inventory.hourlyNetRate',
    placeholderKey: 'inventory.hourlyNetRatePlaceholder',
    get: (form) => form.hourlyNetRate,
    set: (form, value) => ({ ...form, hourlyNetRate: value }),
  },
};
