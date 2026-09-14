/** Company result contracts used by the reporting page (see `Reporting/CompanyResultEndpoints.Contracts.cs`). */

import type { QuoteLineKind } from '../quotes/quotes.types';

/** One status row of the report: how many quotes it holds and what they are worth. */
export interface CompanyResultStatusRowDto {
  quoteCount: number;
  net: number;
  gross: number;
}

/** One month of the yearly breakdown; months without an accepted quote arrive with zeros. */
export interface CompanyResultMonthDto {
  month: number;
  acceptedQuoteCount: number;
  acceptedNet: number;
  acceptedGross: number;
}

/** Tax base and tax charged at one VAT rate across the accepted quotes. */
export interface CompanyResultVatRowDto {
  vatRatePercent: number;
  net: number;
  vat: number;
}

/** Parts against labor within the accepted quotes. */
export interface CompanyResultLineKindRowDto {
  lineKind: QuoteLineKind;
  net: number;
  gross: number;
}

/** Revenue report returned by {@code GET /api/company-results}. */
export interface CompanyResultDto {
  year: number;
  month: number | null;
  accepted: CompanyResultStatusRowDto;
  pending: CompanyResultStatusRowDto;
  expired: CompanyResultStatusRowDto;
  rejected: CompanyResultStatusRowDto;
  draftQuoteCount: number;
  acceptedByLineKind: CompanyResultLineKindRowDto[];
  months: CompanyResultMonthDto[];
  acceptedVatBreakdown: CompanyResultVatRowDto[];
}
