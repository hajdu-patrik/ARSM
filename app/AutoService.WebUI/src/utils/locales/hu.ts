import { huCore } from './hu.core';
import { huFeature } from './hu.feature';
import { huPricing } from './hu.pricing';

export const hu = {
  ...huCore,
  ...huFeature,
  ...huPricing,
} as const;
