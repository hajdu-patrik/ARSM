/** Part and labor-type catalog contracts used by the Inventory page. */

/** Allowed VAT rate percentages, matching the backend `CK_*_VatRate` check constraints. */
export const VAT_RATE_OPTIONS = [0, 5, 18, 27] as const;

/** VAT rate percentage as a discriminated numeric literal union. */
export type VatRatePercent = (typeof VAT_RATE_OPTIONS)[number];

/** Default VAT rate applied to new catalog items. */
export const DEFAULT_VAT_RATE_PERCENT: VatRatePercent = 27;

/** Maximum part number / labor type code length, matching the backend `MaxLength` validation. */
export const MAX_CATALOG_IDENTIFIER_LENGTH = 40;

/** Maximum part/labor-type name length, matching the backend `MaxLength` validation. */
export const MAX_CATALOG_NAME_LENGTH = 120;

/** Part catalog item returned by {@code GET /api/parts} and {@code GET /api/parts/{id}}. */
export interface PartDto {
  id: number;
  partNumber: string;
  name: string;
  netUnitPrice: number;
  grossUnitPrice: number;
  vatRatePercent: number;
}

/** Request payload for creating a part via {@code POST /api/parts}. */
export interface CreatePartRequest {
  partNumber: string;
  name: string;
  netUnitPrice: number;
  vatRatePercent: number;
}

/** Request payload for updating a part via {@code PUT /api/parts/{id}}. */
export interface UpdatePartRequest {
  partNumber: string;
  name: string;
  netUnitPrice: number;
  vatRatePercent: number;
}

/** Labor type catalog item returned by {@code GET /api/labor-types} and {@code GET /api/labor-types/{id}}. */
export interface LaborTypeDto {
  id: number;
  code: string;
  name: string;
  hourlyNetRate: number;
  grossHourlyRate: number;
  vatRatePercent: number;
}

/** Request payload for creating a labor type via {@code POST /api/labor-types}. */
export interface CreateLaborTypeRequest {
  code: string;
  name: string;
  hourlyNetRate: number;
  vatRatePercent: number;
}

/** Request payload for updating a labor type via {@code PUT /api/labor-types/{id}}. */
export interface UpdateLaborTypeRequest {
  code: string;
  name: string;
  hourlyNetRate: number;
  vatRatePercent: number;
}
