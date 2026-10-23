import { expect, test } from '@playwright/test';
import type { AppointmentDto, AppointmentStatus } from '../../src/types/scheduler/scheduler.types';
import { ANNA_VEHICLE_ROW, CustomersPage } from './pages/customers.page';
import { QuotesPage } from './pages/quotes.page';
import { readDropdownOptionValues } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_CUSTOMER_IDS, MOCK_QUOTE_IDS } from './support/test-data';
import { MOCK_VEHICLE_IDS } from './support/test-data.constants';
import type { MockApiState } from './support/test-data';

const LOCKED_APPOINTMENT_ID = 6201;
const LINKABLE_APPOINTMENT_ID = 6202;
const CLOSED_APPOINTMENT_ID = 6203;
const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';

/** Builds an appointment in the given status, with the flags the API derives for it. */
function buildAppointment(state: MockApiState, id: number, status: AppointmentStatus, taskDescription: string): AppointmentDto {
  const template = state.customerHistoryByCustomerId[MOCK_CUSTOMER_IDS.anna]?.[0];
  if (template === undefined) {
    throw new Error('The fixture history appointment is missing.');
  }

  const isOpen = status === 'InProgress';

  return {
    ...template,
    id,
    taskDescription,
    status,
    completedAt: status === 'Completed' ? template.completedAt : null,
    canceledAt: status === 'Cancelled' ? template.scheduledDate : null,
    hasAcceptedQuote: false,
    canComplete: false,
    canDelete: status !== 'Completed',
    canLinkQuote: isOpen,
  };
}

/** Registers an appointment in the scheduler list and links the given fixture quotes to it. */
function linkQuotes(state: MockApiState, appointment: AppointmentDto, quoteIds: readonly number[]): void {
  state.appointments.push(appointment);

  for (const quote of state.quotes) {
    if (quoteIds.includes(quote.id)) {
      quote.appointmentId = appointment.id;
    }
  }
}

test.describe('Quotes - appointment lock', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a quote of a cancelled appointment is read-only, with the PDF and delete still available', async ({ page }) => {
    const state = await signInWithMocks(page);
    linkQuotes(state, buildAppointment(state, LOCKED_APPOINTMENT_ID, 'Cancelled', 'Cancelled job'), [MOCK_QUOTE_IDS.sentDiagnostics]);
    const quotesPage = new QuotesPage(page);

    await quotesPage.goto();
    // The server flag frees the delete of a Sent quote whose appointment was cancelled.
    await expect(quotesPage.rowAction(SENT_NUMBER, 'quote-delete-button')).toBeEnabled();
    await quotesPage.openQuote(SENT_NUMBER);

    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('linked appointment was cancelled');
    await expect(page.getByTestId('quote-title-input')).toBeDisabled();
    await expect(page.getByTestId('quote-valid-until-input')).toBeDisabled();
    await expect(page.getByTestId('quote-save-validity-button')).toBeDisabled();
    await expect(page.getByTestId('quote-add-line-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-accept-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-reject-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-save-header-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-download-pdf-button')).toBeVisible();
    await expect(page.getByTestId('quote-delete-draft-button')).toBeVisible();
  });

  test('a quote of a completed appointment can be viewed and printed but never deleted', async ({ page }) => {
    const state = await signInWithMocks(page);
    linkQuotes(state, buildAppointment(state, LOCKED_APPOINTMENT_ID, 'Completed', 'Finished job'), [MOCK_QUOTE_IDS.draftTimingBelt]);
    const quotesPage = new QuotesPage(page);

    await quotesPage.goto();
    const rowDelete = quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button');
    await expect(rowDelete).toBeDisabled();
    await expect(rowDelete).toHaveAttribute('title', 'A quote of a completed appointment cannot be deleted.');

    await quotesPage.openQuote(DRAFT_NUMBER);
    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('linked appointment is completed');
    await expect(page.getByTestId('quote-title-input')).toBeDisabled();
    await expect(page.getByTestId('quote-add-line-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-download-pdf-button')).toBeVisible();
    await expect(page.getByTestId('quote-delete-draft-button')).toHaveCount(0);
  });

  test('an accepted sibling locks the other draft, which stays deletable', async ({ page }) => {
    const state = await signInWithMocks(page);
    const sent = state.quotes.find((quote) => quote.id === MOCK_QUOTE_IDS.sentDiagnostics);
    if (sent === undefined) {
      throw new Error('The fixture sent quote is missing.');
    }

    sent.status = 'Accepted';
    linkQuotes(
      state,
      buildAppointment(state, LOCKED_APPOINTMENT_ID, 'InProgress', 'Job with an accepted quote'),
      [MOCK_QUOTE_IDS.draftTimingBelt, MOCK_QUOTE_IDS.sentDiagnostics],
    );
    const quotesPage = new QuotesPage(page);

    await quotesPage.goto();
    await expect(quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button')).toBeEnabled();
    await quotesPage.openQuote(DRAFT_NUMBER);

    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('Another quote of the linked appointment has been accepted');
    await expect(page.getByTestId('quote-title-input')).toBeDisabled();
    await expect(page.getByTestId('quote-add-line-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-save-header-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-send-button')).toHaveCount(0);
    await expect(page.getByTestId('quote-delete-draft-button')).toBeVisible();
  });

  test('the create modal offers only appointments that can still take a quote', async ({ page }) => {
    const state = await signInWithMocks(page);
    const linkable = buildAppointment(state, LINKABLE_APPOINTMENT_ID, 'InProgress', 'Open job');
    const closed = buildAppointment(state, CLOSED_APPOINTMENT_ID, 'Completed', 'Closed job');
    state.vehicleHistoryByVehicleId[MOCK_VEHICLE_IDS.annaNxe441] = [linkable, closed];
    const customersPage = new CustomersPage(page);
    const quotesPage = new QuotesPage(page);

    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    const dialog = await quotesPage.startQuoteFromVehicle(MOCK_CUSTOMER_IDS.anna, ANNA_VEHICLE_ROW.nxe441);
    await expect(dialog.getByTestId('quote-appointment-select')).toBeVisible();

    const values = await readDropdownOptionValues(page, 'quote-appointment-select');
    expect(values).toEqual(['', String(LINKABLE_APPOINTMENT_ID)]);
  });
});
