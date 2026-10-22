/** Part and labor-type catalog contracts used by the Inventory page. */

/** VAT rates accepted for new and edited items; a legacy stored 0 still lists but cannot be saved again. */
export const VAT_RATE_OPTIONS = [5, 18, 27] as const;

/** VAT rate percentage as a discriminated numeric literal union. */
export type VatRatePercent = (typeof VAT_RATE_OPTIONS)[number];

/** True when the rate is one of the allowed VAT rates. */
export function isAllowedVatRate(rate: number): rate is VatRatePercent {
  return VAT_RATE_OPTIONS.some((option) => option === rate);
}

/** Default VAT rate applied to new catalog items. */
export const DEFAULT_VAT_RATE_PERCENT: VatRatePercent = 27;

/** Maximum part number / labor type code length, matching the backend `MaxLength` validation. */
export const MAX_CATALOG_IDENTIFIER_LENGTH = 40;

/** Maximum part/labor-type name length, matching the backend `MaxLength` validation. */
export const MAX_CATALOG_NAME_LENGTH = 120;

/** Part catalog item returned by `GET /api/parts` and `GET /api/parts/{id}`. */
export interface PartDto {
  id: number;
  partNumber: string;
  name: string;
  netUnitPrice: number;
  grossUnitPrice: number;
  vatRatePercent: number;
  /** Concurrency version the next update must echo. */
  version: number;
}

/** Request payload for creating a part via `POST /api/parts`. */
export interface CreatePartRequest {
  partNumber: string;
  name: string;
  netUnitPrice: number;
  vatRatePercent: number;
}

/** Request payload for updating a part via `PUT /api/parts/{id}`; a stale `version` is refused with a 409. */
export interface UpdatePartRequest {
  partNumber: string;
  name: string;
  netUnitPrice: number;
  vatRatePercent: number;
  version: number;
}

/** Labor type catalog item returned by `GET /api/labor-types` and `GET /api/labor-types/{id}`. */
export interface LaborTypeDto {
  id: number;
  code: string;
  name: string;
  hourlyNetRate: number;
  grossHourlyRate: number;
  vatRatePercent: number;
  /** Concurrency version the next update must echo. */
  version: number;
}

/** Request payload for creating a labor type via `POST /api/labor-types`. */
export interface CreateLaborTypeRequest {
  code: string;
  name: string;
  hourlyNetRate: number;
  vatRatePercent: number;
}

/** Request payload for updating a labor type via `PUT /api/labor-types/{id}`; a stale `version` is refused with a 409. */
export interface UpdateLaborTypeRequest {
  code: string;
  name: string;
  hourlyNetRate: number;
  vatRatePercent: number;
  version: number;
}
