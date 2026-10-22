/** Per-entity i18n keys, labels, and DTO accessors consumed by the generic `CatalogTab` component. */
import type { LaborTypeDto, PartDto } from '../../types/catalog/catalog.types';

export interface CatalogTabConfig<TDto> {
  readonly testIdPrefix: 'inventory-parts' | 'inventory-labor-types';
  readonly paginationTestIdPrefix: 'parts-pagination' | 'labor-types-pagination';
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
  readonly getVersion: (item: TDto) => number;
}

export const partCatalogTabConfig: CatalogTabConfig<PartDto> = {
  testIdPrefix: 'inventory-parts',
  paginationTestIdPrefix: 'parts-pagination',
  searchPlaceholderKey: 'inventory.searchPlaceholderParts',
  createLabelKey: 'inventory.createPart',
  emptyKey: 'inventory.emptyParts',
  loadingKey: 'inventory.loadingParts',
  identifierColumnKey: 'inventory.partNumber',
  netColumnKey: 'common.fields.netUnitPrice',
  grossColumnKey: 'inventory.columns.grossUnitPrice',
  editLabelKey: 'inventory.editPart',
  deleteLabelKey: 'inventory.deletePart',
  getId: (part) => part.id,
  getName: (part) => part.name,
  getIdentifier: (part) => part.partNumber,
  getNet: (part) => part.netUnitPrice,
  getVat: (part) => part.vatRatePercent,
  getGross: (part) => part.grossUnitPrice,
  getVersion: (part) => part.version,
};

export const laborTypeCatalogTabConfig: CatalogTabConfig<LaborTypeDto> = {
  testIdPrefix: 'inventory-labor-types',
  paginationTestIdPrefix: 'labor-types-pagination',
  searchPlaceholderKey: 'inventory.searchPlaceholderLaborTypes',
  createLabelKey: 'inventory.createLaborType',
  emptyKey: 'inventory.emptyLaborTypes',
  loadingKey: 'inventory.loadingLaborTypes',
  identifierColumnKey: 'inventory.code',
  netColumnKey: 'common.fields.hourlyNetRate',
  grossColumnKey: 'inventory.columns.grossHourlyRate',
  editLabelKey: 'inventory.editLaborType',
  deleteLabelKey: 'inventory.deleteLaborType',
  getId: (laborType) => laborType.id,
  getName: (laborType) => laborType.name,
  getIdentifier: (laborType) => laborType.code,
  getNet: (laborType) => laborType.hourlyNetRate,
  getVat: (laborType) => laborType.vatRatePercent,
  getGross: (laborType) => laborType.grossHourlyRate,
  getVersion: (laborType) => laborType.version,
};
