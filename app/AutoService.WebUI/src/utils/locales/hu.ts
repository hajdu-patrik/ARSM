import { huCore } from './hu.core';
import { huFeature } from './hu.feature';

export const hu = {
  ...huCore,
  ...huFeature,
} as const;
