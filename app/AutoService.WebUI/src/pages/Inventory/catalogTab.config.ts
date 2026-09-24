/**
 * Catalog tab configuration: the i18n keys, labels, and DTO field
 * accessors that differ between the Parts and Labor types tabs. The
 * generic `CatalogTab` component is instantiated once per entity with one
 * of these configs instead of duplicating the tab markup per entity.
 * @module pages/Inventory/catalogTab.config
 */
import type { LaborTypeDto, PartDto } from '../../types/catalog/catalog.types';

/** Per-entity configuration consumed by the generic `CatalogTab` component. */
export interface CatalogTabConfig<TDto> {
  readonly testIdPrefix: 'inventory-parts' | 'inventory-labor-types';
  readonly searchPlaceholderKey: string;
  readonly createLabelKey: string;
  readonly emptyKey: string;
  readonly loadingKey: string;
  readonly identifierColumnKey: string;
  readonly netColumnKey: string;
  readonly grossColumnKey: string;
  readonly editLabelKey: string;
  readonly deleteLabelKey: string;
  readonly getId: (item: TDto) => number;
  readonly getName: (item: TDto) => string;
  readonly getIdentifier: (item: TDto) => string;
  readonly getNet: (item: TDto) => number;
  readonly getVat: (item: TDto) => number;
  readonly getGross: (item: TDto) => number;
}

/** Parts tab configuration. */
export const partCatalogTabConfig: CatalogTabConfig<PartDto> = {
  testIdPrefix: 'inventory-parts',
  searchPlaceholderKey: 'inventory.searchPlaceholderParts',
  createLabelKey: 'inventory.createPart',
  emptyKey: 'inventory.emptyParts',
  loadingKey: 'inventory.loadingParts',
  identifierColumnKey: 'inventory.columns.partNumber',
  netColumnKey: 'inventory.columns.netUnitPrice',
  grossColumnKey: 'inventory.columns.grossUnitPrice',
  editLabelKey: 'inventory.editPart',
  deleteLabelKey: 'inventory.deletePart',
  getId: (part) => part.id,
  getName: (part) => part.name,
  getIdentifier: (part) => part.partNumber,
  getNet: (part) => part.netUnitPrice,
  getVat: (part) => part.vatRatePercent,
  getGross: (part) => part.grossUnitPrice,
};

/** Labor types tab configuration. */
export const laborTypeCatalogTabConfig: CatalogTabConfig<LaborTypeDto> = {
  testIdPrefix: 'inventory-labor-types',
  searchPlaceholderKey: 'inventory.searchPlaceholderLaborTypes',
  createLabelKey: 'inventory.createLaborType',
  emptyKey: 'inventory.emptyLaborTypes',
  loadingKey: 'inventory.loadingLaborTypes',
  identifierColumnKey: 'inventory.columns.code',
  netColumnKey: 'inventory.columns.hourlyNetRate',
  grossColumnKey: 'inventory.columns.grossHourlyRate',
  editLabelKey: 'inventory.editLaborType',
  deleteLabelKey: 'inventory.deleteLaborType',
  getId: (laborType) => laborType.id,
  getName: (laborType) => laborType.name,
  getIdentifier: (laborType) => laborType.code,
  getNet: (laborType) => laborType.hourlyNetRate,
  getVat: (laborType) => laborType.vatRatePercent,
  getGross: (laborType) => laborType.grossHourlyRate,
};
