/** Per-entity element ids and i18n keys consumed by the generic `CatalogFormModal`. */

/** A single identifier/rate field: element id and i18n keys. */
interface CatalogFormFieldConfig {
  readonly elementId: string;
  readonly labelKey: string;
  readonly placeholderKey: string;
}

export interface CatalogFormModalConfig {
  readonly formElementId: string;
  readonly createTitleKey: string;
  readonly editTitleKey: string;
  readonly nameElementId: string;
  readonly vatRateElementId: string;
  readonly grossPreviewElementId: string;
  readonly grossPreviewLabelKey: string;
  readonly identifier: CatalogFormFieldConfig;
  readonly rate: CatalogFormFieldConfig;
}

export const partCatalogFormConfig: CatalogFormModalConfig = {
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
  },
  rate: {
    elementId: 'part-net-price',
    labelKey: 'common.fields.netUnitPrice',
    placeholderKey: 'inventory.netUnitPricePlaceholder',
  },
};

export const laborTypeCatalogFormConfig: CatalogFormModalConfig = {
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
  },
  rate: {
    elementId: 'labor-type-hourly-rate',
    labelKey: 'common.fields.hourlyNetRate',
    placeholderKey: 'inventory.hourlyNetRatePlaceholder',
  },
};
