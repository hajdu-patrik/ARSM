import type { OptionItem } from './types';

export const SPECIALIZATION_OPTIONS: OptionItem[] = [
  { value: 'GasolineAndDiesel', labelKey: 'admin.spec.gasolineAndDiesel' },
  { value: 'HybridAndElectric', labelKey: 'admin.spec.hybridAndElectric' },
  { value: 'All', labelKey: 'admin.spec.all' },
];

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

export const inputClass =
  'w-full rounded-xl border border-[#D8D2E9] bg-[#F6F4FB] px-4 py-3 text-[15px] text-[#2C2440] placeholder-[#8A829F] outline-none transition focus-visible:border-[#C9B3FF] focus-visible:ring-2 focus-visible:ring-[#C9B3FF66] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:bg-[#1A1A25] dark:text-[#EDE8FA] dark:placeholder-[#8C83A8] dark:focus-visible:border-[#C9B3FF] dark:focus-visible:ring-[#C9B3FF3D] ';

export const labelClass = 'mb-1.5 block text-sm font-medium text-[#5E5672] dark:text-[#CFC5EA]';
