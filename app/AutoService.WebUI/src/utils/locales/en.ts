import { enCore } from './en.core';
import { enFeature } from './en.feature';
import { enPricing } from './en.pricing';

export const en = {
  ...enCore,
  ...enFeature,
  ...enPricing,
} as const;
