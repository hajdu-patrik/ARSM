/** Simulates another user changing a quote or its appointment first, so a request that still carries
 * the old quote version meets the API's 409, or the lock the new appointment status brings. */
import type { QuoteDetailDto } from '../../../src/types/quotes/quotes.types';
import type { MockApiState } from './test-data';

/** Replaces the quote by a changed copy with the next version, like a save by someone else. */
export function changeQuoteElsewhere(state: MockApiState, quoteId: number, changes: Partial<QuoteDetailDto>): void {
  const index = state.quotes.findIndex((quote) => quote.id === quoteId);
  const quote = state.quotes[index];

  if (quote === undefined) {
    throw new Error(`Unknown mock quote ${String(quoteId)}.`);
  }

  state.quotes[index] = { ...quote, ...changes, version: quote.version + 1 };
}

/** Moves a scheduler appointment to a closing status, which locks its quotes the way the API does. */
export function closeAppointmentElsewhere(state: MockApiState, appointmentId: number, status: 'Cancelled' | 'Completed'): void {
  const index = state.appointments.findIndex((appointment) => appointment.id === appointmentId);
  const appointment = state.appointments[index];

  if (appointment === undefined) {
    throw new Error(`Unknown mock appointment ${String(appointmentId)}.`);
  }

  state.appointments[index] = {
    ...appointment,
    status,
    canLinkQuote: false,
    canDelete: status !== 'Completed',
    canceledAt: status === 'Cancelled' ? appointment.scheduledDate : null,
  };
}
