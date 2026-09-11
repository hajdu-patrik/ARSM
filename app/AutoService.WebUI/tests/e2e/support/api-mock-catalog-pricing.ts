import type { MockApiState } from './test-data';

/** Mirrors the backend's display-only gross formula (plan F1, `Pricing/PricingCalculator.GrossUnitPrice`). */
export function computeGrossAmount(netAmount: number, vatRatePercent: number): number {
  return Math.round(netAmount * (1 + vatRatePercent / 100) * 100) / 100;
}

/**
 * Resolves the gross amount a create/update response carries, consuming a
 * test's one-shot `state.catalogGrossOverride` when set. This is how a spec
 * proves the list row renders the server DTO's gross value rather than
 * recomputing it locally: the override deliberately does not match the
 * formula result.
 */
export function resolveGrossAmount(state: MockApiState, netAmount: number, vatRatePercent: number): number {
  if (state.catalogGrossOverride !== null) {
    const override = state.catalogGrossOverride;
    state.catalogGrossOverride = null;
    return override;
  }

  return computeGrossAmount(netAmount, vatRatePercent);
}
