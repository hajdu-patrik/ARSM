/**
 * Mocked company result route (plan F6).
 *
 * The report is derived from the same mock quotes the rest of the suite
 * mutates, so accepting a quote in one step really moves money into the
 * accepted row in the next. It keeps the rules the page depends on: a quote
 * counts in the month it was created in, Sent splits into pending and expired
 * by its validity, a draft appears only as a count, and an empty period
 * answers with zeros rather than 404.
 */
import type { Route } from '@playwright/test';
import type { QuoteDetailDto } from '../../../src/types/quotes/quotes.types';
import type {
  CompanyResultDto,
  CompanyResultStatusRowDto,
} from '../../../src/types/reporting/company-results.types';
import type { InstallApiMockOptions } from './api-mocks';
import type { MockApiState } from './test-data';
import { isAuthenticated } from './api-mock-authz';
import { fulfillJson } from './api-mock-response';

const EMPTY_ROW: CompanyResultStatusRowDto = { quoteCount: 0, net: 0, gross: 0 };

/** Sums one status bucket of the period. */
function toStatusRow(quotes: QuoteDetailDto[]): CompanyResultStatusRowDto {
  return quotes.reduce<CompanyResultStatusRowDto>(
    (row, quote) => ({
      quoteCount: row.quoteCount + 1,
      net: row.net + quote.totalNet,
      gross: row.gross + quote.totalGross,
    }),
    { ...EMPTY_ROW },
  );
}

/** Applies the period filter, cutting on the creation instant in UTC. */
function inPeriod(quote: QuoteDetailDto, year: number, month: number | null): boolean {
  const createdAt = new Date(quote.createdAt);
  return createdAt.getUTCFullYear() === year && (month === null || createdAt.getUTCMonth() + 1 === month);
}

/** Builds the report body for one period. */
function buildReport(state: MockApiState, year: number, month: number | null): CompanyResultDto {
  const now = Date.now();
  const periodQuotes = state.quotes.filter((quote) => inPeriod(quote, year, month));
  const accepted = periodQuotes.filter((quote) => quote.status === 'Accepted');
  const sent = periodQuotes.filter((quote) => quote.status === 'Sent');
  const pending = sent.filter((quote) => new Date(quote.validUntil).getTime() >= now);
  const expired = sent.filter((quote) => new Date(quote.validUntil).getTime() < now);
  const acceptedLines = accepted.flatMap((quote) => quote.lines);
  const monthsInPeriod = month === null ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [month];

  const vatRates = [...new Set(acceptedLines.map((line) => line.vatRatePercent))].sort((left, right) => left - right);
  const lineKinds = [...new Set(acceptedLines.map((line) => line.lineKind))].sort();

  return {
    year,
    month,
    accepted: toStatusRow(accepted),
    pending: toStatusRow(pending),
    expired: toStatusRow(expired),
    rejected: toStatusRow(periodQuotes.filter((quote) => quote.status === 'Rejected')),
    draftQuoteCount: periodQuotes.filter((quote) => quote.status === 'Draft').length,
    acceptedByLineKind: lineKinds.map((lineKind) => {
      const lines = acceptedLines.filter((line) => line.lineKind === lineKind);
      return {
        lineKind,
        net: lines.reduce((sum, line) => sum + line.netAmount, 0),
        gross: lines.reduce((sum, line) => sum + line.grossAmount, 0),
      };
    }),
    months: monthsInPeriod.map((periodMonth) => {
      const monthQuotes = accepted.filter((quote) => new Date(quote.createdAt).getUTCMonth() + 1 === periodMonth);
      return {
        month: periodMonth,
        acceptedQuoteCount: monthQuotes.length,
        acceptedNet: monthQuotes.reduce((sum, quote) => sum + quote.totalNet, 0),
        acceptedGross: monthQuotes.reduce((sum, quote) => sum + quote.totalGross, 0),
      };
    }),
    acceptedVatBreakdown: vatRates.map((vatRatePercent) => {
      const lines = acceptedLines.filter((line) => line.vatRatePercent === vatRatePercent);
      return {
        vatRatePercent,
        net: lines.reduce((sum, line) => sum + line.netAmount, 0),
        vat: lines.reduce((sum, line) => sum + line.vatAmount, 0),
      };
    }),
  };
}

/** Dispatches `/api/company-results` mock requests. */
export async function tryHandleCompanyResultRoute(
  route: Route,
  method: string,
  path: string,
  url: URL,
  state: MockApiState,
  options: InstallApiMockOptions,
): Promise<boolean> {
  if (path !== '/api/company-results') {
    return false;
  }

  if (!isAuthenticated(options)) {
    await fulfillJson(route, { detail: 'Unauthorized' }, 401);
    return true;
  }

  if (method !== 'GET') {
    return false;
  }

  const year = Number(url.searchParams.get('year') ?? new Date().getUTCFullYear());
  const rawMonth = url.searchParams.get('month');
  const month = rawMonth === null ? null : Number(rawMonth);

  if (year < 2000 || year > 2100 || (month !== null && (month < 1 || month > 12))) {
    await fulfillJson(
      route,
      { code: 'invalid_date_range', error: 'Year must be 2000-2100, month must be 1-12.' },
      400,
    );
    return true;
  }

  await fulfillJson(route, buildReport(state, year, month));
  return true;
}
