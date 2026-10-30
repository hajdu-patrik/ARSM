/** What the quote header shows about the quote: the appointment choices in order, the vehicle, status, date
 * and author tiles, and the fallbacks for a removed author and an appointment the vehicle no longer lists. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { readDropdownOptionValues } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_QUOTE_IDS, MOCK_VEHICLE_IDS } from './support/test-data';
import { buildAppointment } from './support/test-data.quotes.appointments';

const VEHICLE_ID = MOCK_VEHICLE_IDS.annaNxe441;
const DRAFT_NUMBER = 'ARSM-2026-0001';

test.describe('Quotes - header tiles and appointment link', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('the appointment choices run newest first, the later id first on the same day', async ({ page }) => {
    const state = await signInWithMocks(page);
    const open = (id: number, scheduledDate: string) => ({ ...buildAppointment(state, id, 'InProgress', `Job ${String(id)}`), scheduledDate });
    state.vehicleHistoryByVehicleId[VEHICLE_ID] = [
      open(6205, '2026-01-10T09:00:00.000Z'),
      open(6206, '2026-03-05T09:00:00.000Z'),
      open(6207, '2026-03-05T09:00:00.000Z'),
    ];
    const quotesPage = new QuotesPage(page);
    await quotesPage.gotoNewQuote(VEHICLE_ID);

    await expect(page.getByTestId('quote-appointment-select')).toBeVisible();
    expect(await readDropdownOptionValues(page, 'quote-appointment-select')).toEqual(['', '6207', '6206', '6205']);
  });

  test('the header names the vehicle, status, creation date and author', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await expect(dialog).toContainText('NXE-441 - Volkswagen Golf');
    await expect(dialog.getByTestId('quote-status-badge').first()).toHaveText('Draft');
    await expect(dialog).toContainText('01/09/2026');
    await expect(dialog).toContainText('Gabor Kovacs');
    await expect(dialog.getByTestId('quote-appointment-select')).toHaveText('No appointment');
    await expect(dialog.getByTestId('quote-appointment-select')).toBeDisabled();
  });

  test('a removed author reads as such, and a link to an appointment the vehicle no longer lists stays visible', async ({ page }) => {
    const state = await signInWithMocks(page);
    const quote = state.quotes.find((candidate) => candidate.id === MOCK_QUOTE_IDS.draftTimingBelt);
    if (quote === undefined) {
      throw new Error('The fixture draft quote is missing.');
    }
    quote.createdByMechanic = null;
    quote.appointmentId = 9999;
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);

    await expect(dialog).toContainText('Removed mechanic');
    await expect(dialog.getByTestId('quote-appointment-select')).toHaveText('Appointment #9999');
  });
});
