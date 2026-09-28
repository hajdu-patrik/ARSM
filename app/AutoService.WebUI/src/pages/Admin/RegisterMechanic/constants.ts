/** Specialization and expertise option arrays for mechanic registration. */

import type { OptionItem } from './types';

/** Available specialization options for the mechanic registration form. */
export const SPECIALIZATION_OPTIONS: OptionItem[] = [
  { value: 'GasolineAndDiesel', labelKey: 'admin.spec.gasolineAndDiesel' },
  { value: 'HybridAndElectric', labelKey: 'admin.spec.hybridAndElectric' },
  { value: 'All', labelKey: 'admin.spec.all' },
];

/** Number of mechanic rows visible in the scrollable list window before it scrolls internally. */
export const MECHANIC_LIST_VISIBLE_ROW_COUNT = 5;

/** Available expertise tag options for the mechanic registration form. */
export const EXPERTISE_OPTIONS: OptionItem[] = [
  { value: 'Engine', labelKey: 'admin.expertise.engine' },
  { value: 'Transmission', labelKey: 'admin.expertise.transmission' },
  { value: 'Brakes', labelKey: 'admin.expertise.brakes' },
  { value: 'Suspension', labelKey: 'admin.expertise.suspension' },
  { value: 'ElectricalSystem', labelKey: 'admin.expertise.electricalSystem' },
  { value: 'AirConditioning', labelKey: 'admin.expertise.airConditioning' },
  { value: 'ExhaustSystem', labelKey: 'admin.expertise.exhaustSystem' },
  { value: 'FuelSystem', labelKey: 'admin.expertise.fuelSystem' },
  { value: 'CoolingSystem', labelKey: 'admin.expertise.coolingSystem' },
  { value: 'Bodywork', labelKey: 'admin.expertise.bodywork' },
];
