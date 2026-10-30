/** Quote header flows: creating a draft (title rule, default validity, appointment link, a link that went
 * stale) and saving title and notes on an existing draft. */
import { expect, test } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { selectDropdownOption } from './support/dropdown';
import { signInWithMocks } from './support/sign-in';
import { MOCK_VEHICLE_IDS } from './support/test-data';
import { buildAppointment } from './support/test-data.quotes.appointments';
import { errorToastMessage, toastMessage } from './support/toast';

const VEHICLE_ID = MOCK_VEHICLE_IDS.annaNxe441;
const CREATE_REQUEST = /\/api\/vehicles\/\d+\/quotes$/;
const DRAFT_NUMBER = 'ARSM-2026-0001';
const DRAFT_TITLE = 'Timing belt replacement';
const DRAFT_NOTES = 'Customer asked for an estimate before the service date.';
const DEFAULT_VALIDITY_DAYS = 30;

/** The date input value and the list's DD/MM/YYYY text of "today plus the default validity window" (UTC). */
function defaultValidity(): { input: string; listed: string } {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + DEFAULT_VALIDITY_DAYS);
  const input = date.toISOString().slice(0, 10);
  const [year, month, day] = input.split('-');

  return { input, listed: `${day ?? ''}/${month ?? ''}/${year ?? ''}` };
}

test.describe('Quotes - create a draft', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('a draft without a title is refused before any request, with the toast and the inline error', async ({ page }) => {
    await signInWithMocks(page);
    const createRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && CREATE_REQUEST.test(request.url())) {
        createRequests.push(request.url());
      }
    });
    const quotesPage = new QuotesPage(page);
    const dialog = await quotesPage.gotoNewQuote(VEHICLE_ID);
    const title = dialog.getByTestId('quote-title-input');

    await expect(title).toHaveAttribute('maxlength', '120');
    await expect(dialog.getByTestId('quote-notes-input')).toHaveAttribute('maxlength', '1000');
    await expect(dialog.getByText('Create the draft first, then add its lines.')).toBeVisible();

    await title.fill('   ');
    await dialog.getByTestId('quote-create-button').click();

    await expect(errorToastMessage(page, 'The quote title is required.')).toBeVisible();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription('The quote title is required.');
    expect(createRequests).toHaveLength(0);

    await title.fill('Brake check');
    await expect(title).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('a new draft starts with the default validity, keeps its notes and locks the appointment link', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    const dialog = await quotesPage.gotoNewQuote(VEHICLE_ID);
    const expected = defaultValidity();

    await expect(dialog.getByTestId('quote-valid-until-input')).toHaveValue(expected.input);
    await dialog.getByTestId('quote-title-input').fill('Clutch replacement estimate');
    await dialog.getByTestId('quote-notes-input').fill('Ask about the flywheel.');
    await dialog.getByTestId('quote-create-button').click();

    await expect(toastMessage(page, 'Draft quote created successfully.')).toBeVisible();
    await expect(quotesPage.totalGross()).toHaveText('HUF 0');
    // Once created, the dialog is named after the quote instead of "New quote".
    const created = quotesPage.editorDialog();
    await expect(created.getByTestId('quote-notes-input')).toHaveValue('Ask about the flywheel.');
    await expect(created.getByTestId('quote-appointment-select')).toBeDisabled();
    await expect(created.getByText('The appointment link is set when the quote is created.')).toBeVisible();

    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.row('ARSM-2026-0004')).toContainText(expected.listed);
  });

  test('a draft created with an appointment sends that link and shows it on the finished quote', async ({ page }) => {
    const state = await signInWithMocks(page);
    state.vehicleHistoryByVehicleId[VEHICLE_ID] = [buildAppointment(state, 6202, 'InProgress', 'Open job')];
    const quotesPage = new QuotesPage(page);
    const dialog = await quotesPage.gotoNewQuote(VEHICLE_ID);

    await selectDropdownOption(page, 'quote-appointment-select', '6202');
    await dialog.getByTestId('quote-title-input').fill('Quote for the open job');
    const createRequest = page.waitForRequest((request) => request.method() === 'POST' && CREATE_REQUEST.test(request.url()));
    await dialog.getByTestId('quote-create-button').click();

    expect((await createRequest).postDataJSON()).toMatchObject({ title: 'Quote for the open job', appointmentId: 6202 });
    // Once created, the dialog is named after the quote instead of "New quote".
    const created = quotesPage.editorDialog();
    await expect(created.getByTestId('quote-appointment-select')).toBeDisabled();
    await expect(created.getByTestId('quote-appointment-select')).toContainText('Open job');
    await expect(created.getByTestId('quote-title-input')).toBeEnabled();
  });

  test('an appointment that was cancelled meanwhile refuses the draft and keeps the form', async ({ page }) => {
    const state = await signInWithMocks(page);
    // The history still offers the link (canLinkQuote), the server already knows the appointment is cancelled.
    state.vehicleHistoryByVehicleId[VEHICLE_ID] = [{ ...buildAppointment(state, 6204, 'Cancelled', 'Cancelled meanwhile'), canLinkQuote: true }];
    const quotesPage = new QuotesPage(page);
    const dialog = await quotesPage.gotoNewQuote(VEHICLE_ID);

    await selectDropdownOption(page, 'quote-appointment-select', '6204');
    await dialog.getByTestId('quote-title-input').fill('Late link');
    await dialog.getByTestId('quote-create-button').click();

    await expect(errorToastMessage(page, 'The linked appointment was cancelled, so its quotes can no longer be changed.')).toBeVisible();
    await expect(dialog.getByTestId('quote-create-button')).toBeVisible();
    await expect(dialog.getByTestId('quote-title-input')).toHaveValue('Late link');

    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.rows()).toHaveCount(3);
  });
});

test.describe('Quotes - save the header of a draft', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test('save needs a real change, stores title and notes, and takes an emptied note back', async ({ page }) => {
    await signInWithMocks(page);
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const save = page.getByTestId('quote-save-header-button');
    const title = dialog.getByTestId('quote-title-input');
    const notes = dialog.getByTestId('quote-notes-input');

    await expect(title).toHaveValue(DRAFT_TITLE);
    await expect(notes).toHaveValue(DRAFT_NOTES);
    await expect(save).toBeDisabled();
    await title.fill('Timing belt and water pump');
    await expect(save).toBeEnabled();
    await title.fill(DRAFT_TITLE);
    await expect(save).toBeDisabled();

    await title.fill('Timing belt and water pump');
    await notes.fill('Check the tensioner too.');
    await save.click();

    await expect(toastMessage(page, 'Quote updated successfully.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: `${DRAFT_NUMBER} - Timing belt and water pump` })).toBeVisible();
    await expect(save).toBeDisabled();

    await notes.fill('');
    await save.click();
    await expect(notes).toHaveValue('');
    await expect(save).toBeDisabled();

    await quotesPage.closeEditorButton().click();
    await expect(quotesPage.row(DRAFT_NUMBER)).toContainText('Timing belt and water pump');
  });

  test('saving an emptied title shows the inline error and sends no update', async ({ page }) => {
    await signInWithMocks(page);
    const updates: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PUT' && /\/api\/quotes\/\d+$/.test(request.url())) {
        updates.push(request.url());
      }
    });
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    const dialog = await quotesPage.openQuote(DRAFT_NUMBER);
    const title = dialog.getByTestId('quote-title-input');

    await title.fill('');
    await page.getByTestId('quote-save-header-button').click();

    await expect(errorToastMessage(page, 'The quote title is required.')).toBeVisible();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(title).toHaveAccessibleDescription('The quote title is required.');
    expect(updates).toHaveLength(0);
  });
});
