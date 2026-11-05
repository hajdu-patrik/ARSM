import type { MockApiState } from './test-data';

/** The only VAT rates the server accepts for catalog items and quote line snapshots. */
const ALLOWED_VAT_RATES: readonly number[] = [5, 18, 27];

/** Detail of the 422 the server answers for any other VAT rate. */
export const INVALID_VAT_RATE_DETAIL = 'VAT rate must be 5, 18 or 27 only.';

/** True for a rate the server accepts: 5, 18 or 27 (0 is rejected). */
export function isAllowedVatRate(vatRatePercent: number): boolean {
  return ALLOWED_VAT_RATES.includes(vatRatePercent);
}

/** True when the value has a third decimal; the columns are numeric(18,2), so the API refuses it. */
function hasMoreThanTwoDecimals(value: number): boolean {
  return !Number.isInteger(Math.round(value * 1e6) / 1e4);
}

/** The 422 detail for a money amount outside 0..100,000,000 or with more than 2 decimals (`PricingValidation`). */
export function moneyAmountError(amount: number): string | null {
  if (amount < 0 || amount > 100_000_000) {
    return 'Amount must be at least 0 and at most 100,000,000.';
  }

  return hasMoreThanTwoDecimals(amount) ? 'Amount can have at most 2 decimal places.' : null;
}

/** The 422 detail for a quote quantity that rounds to 0, exceeds 10,000 or has more than 2 decimals. */
export function quantityError(quantity: number): string | null {
  if (Math.round(quantity * 100) / 100 <= 0 || quantity > 10_000) {
    return 'Quantity must be greater than 0 and at most 10,000.';
  }

  return hasMoreThanTwoDecimals(quantity) ? 'Quantity can have at most 2 decimal places.' : null;
}

/** The 422 detail of a catalog item's price: the amount rule first, then the VAT rate, like the API. */
export function catalogPriceError(netPrice: number, vatRatePercent: number): string | null {
  return moneyAmountError(netPrice) ?? (isAllowedVatRate(vatRatePercent) ? null : INVALID_VAT_RATE_DETAIL);
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
