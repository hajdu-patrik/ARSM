/** Per-entity server calls, cache key and messages consumed by the generic `useCatalogItemMutations` hook. */
import { queryKeys, type AuthQueryScope } from '../../services/cache/queryKeys';
import { laborTypeService } from '../../services/catalog/labor-type.service';
import { partService } from '../../services/catalog/part.service';
import type { LaborTypeDto, PartDto } from '../../types/catalog/catalog.types';
import { laborTypeCatalogFormConfig, partCatalogFormConfig, type CatalogFormModalConfig } from './catalogForm.config';
import { laborTypeCatalogTabConfig, partCatalogTabConfig, type CatalogTabConfig } from './catalogTab.config';
import type { CatalogItemKind } from './helpers';
import type { CatalogItemValues } from './hooks/catalogMutation.helpers';

/** Everything that differs between parts and labor types in the create/edit/delete flow. */
export interface CatalogItemConfig<TDto> {
  readonly kind: CatalogItemKind;
  readonly tab: CatalogTabConfig<TDto>;
  readonly form: CatalogFormModalConfig;
  readonly queryKey: (scope: AuthQueryScope) => readonly unknown[];
  readonly create: (values: CatalogItemValues) => Promise<unknown>;
  readonly update: (id: number, version: number, values: CatalogItemValues) => Promise<void>;
  readonly fetchItem: (id: number) => Promise<TDto>;
  readonly remove: (id: number) => Promise<void>;
  /** Code of the 409 that refuses an update carrying a stale version. */
  readonly versionConflictCode: string;
  readonly createdKey: string;
  readonly updatedKey: string;
  readonly deletedKey: string;
  readonly saveFailedKey: string;
  readonly deleteFailedKey: string;
}

/** Maps the validated form values to a part request. */
const toPartRequest = ({ identifier, name, rate, vatRatePercent }: CatalogItemValues) => (
  { partNumber: identifier, name, netUnitPrice: rate, vatRatePercent }
);

/** Maps the validated form values to a labor type request. */
const toLaborTypeRequest = ({ identifier, name, rate, vatRatePercent }: CatalogItemValues) => (
  { code: identifier, name, hourlyNetRate: rate, vatRatePercent }
);

/** Part create/edit/delete configuration. */
export const partCatalogItemConfig: CatalogItemConfig<PartDto> = {
  kind: 'part',
  tab: partCatalogTabConfig,
  form: partCatalogFormConfig,
  queryKey: (scope) => queryKeys.catalog.parts(scope),
  create: (values) => partService.createPart(toPartRequest(values)),
  update: (id, version, values) => partService.updatePart(id, { ...toPartRequest(values), version }),
  fetchItem: (id) => partService.getPart(id),
  remove: (id) => partService.deletePart(id),
  versionConflictCode: 'part_version_conflict',
  createdKey: 'inventory.toasts.partCreated',
  updatedKey: 'inventory.toasts.partUpdated',
  deletedKey: 'inventory.toasts.partDeleted',
  saveFailedKey: 'inventory.errors.partSaveFailed',
  deleteFailedKey: 'inventory.errors.partDeleteFailed',
};

/** Labor type create/edit/delete configuration. */
export const laborTypeCatalogItemConfig: CatalogItemConfig<LaborTypeDto> = {
  kind: 'laborType',
  tab: laborTypeCatalogTabConfig,
  form: laborTypeCatalogFormConfig,
  queryKey: (scope) => queryKeys.catalog.laborTypes(scope),
  create: (values) => laborTypeService.createLaborType(toLaborTypeRequest(values)),
  update: (id, version, values) => laborTypeService.updateLaborType(id, { ...toLaborTypeRequest(values), version }),
  fetchItem: (id) => laborTypeService.getLaborType(id),
  remove: (id) => laborTypeService.deleteLaborType(id),
  versionConflictCode: 'labor_type_version_conflict',
  createdKey: 'inventory.toasts.laborTypeCreated',
  updatedKey: 'inventory.toasts.laborTypeUpdated',
  deletedKey: 'inventory.toasts.laborTypeDeleted',
  saveFailedKey: 'inventory.errors.laborTypeSaveFailed',
  deleteFailedKey: 'inventory.errors.laborTypeDeleteFailed',
};
