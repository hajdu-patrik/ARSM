/** Mocked quote PDF route: a tiny PDF body named like the API names the file (`Content-Disposition`). */
import type { Route } from '@playwright/test';
import type { MockApiState } from './test-data';
import { corsHeaders, fulfillJson } from './api-mock-response';

/** Answers `GET /api/quotes/{id}/pdf`: every status is printable, so no lock or status check applies. */
export async function handleQuotePdf(route: Route, state: MockApiState, quoteId: number): Promise<void> {
  const quote = state.quotes.find((candidate) => candidate.id === quoteId);

  if (!quote) {
    await fulfillJson(route, { detail: 'Quote not found.' }, 404);
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: 'application/pdf',
    headers: {
      ...corsHeaders(route),
      'access-control-expose-headers': 'Content-Disposition',
      'content-disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
    body: '%PDF-1.4\n%%EOF\n',
  });
}
