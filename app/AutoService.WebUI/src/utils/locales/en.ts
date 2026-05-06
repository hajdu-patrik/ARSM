import { enCore } from './en.core';
import { enFeature } from './en.feature';

export const en = {
  ...enCore,
  ...enFeature,
} as const;
