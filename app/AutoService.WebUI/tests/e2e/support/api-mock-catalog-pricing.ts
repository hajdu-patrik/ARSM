import type { MockApiState } from './test-data';

/** The only VAT rates the server accepts for catalog items and quote line snapshots. */
const ALLOWED_VAT_RATES: readonly number[] = [5, 18, 27];

/** Detail of the 422 the server answers for any other VAT rate. */
export const INVALID_VAT_RATE_DETAIL = 'VAT rate must be 5, 18 or 27 only.';

/** True for a rate the server accepts: 5, 18 or 27 (0 is rejected). */
export function isAllowedVatRate(vatRatePercent: number): boolean {
  return ALLOWED_VAT_RATES.includes(vatRatePercent);
}

/** Mirrors the backend's display-only gross formula (`Pricing/PricingCalculator.GrossUnitPrice`). */
function computeGrossAmount(netAmount: number, vatRatePercent: number): number {
  return Math.round(netAmount * (1 + vatRatePercent / 100) * 100) / 100;
}

/** Resolves the gross for a create/update response, consuming a one-shot `state.catalogGrossOverride`
 * so a spec can prove the row renders the server's gross value instead of recomputing it locally. */
export function resolveGrossAmount(state: MockApiState, netAmount: number, vatRatePercent: number): number {
  if (state.catalogGrossOverride !== null) {
    const override = state.catalogGrossOverride;
    state.catalogGrossOverride = null;
    return override;
  }

  return computeGrossAmount(netAmount, vatRatePercent);
}
