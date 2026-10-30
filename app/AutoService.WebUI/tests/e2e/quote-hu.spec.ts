/** The quote editor in Hungarian: number formats of a fractional-hour labor line, the validation, send and
 * delete wording, and the toasts. English is asserted by the other quote specs. */
import { expect, test, type Page } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { MOCK_VEHICLE_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const SENT_NUMBER = 'ARSM-2026-0002';

/** Signs in through the session hint with the language preset to Hungarian. */
async function bootHungarian(page: Page): Promise<void> {
  await primeBrowserState(page, { language: 'hu', sessionHint: true });
  await installApiMocks(page, { profileEmail: 'mechanic.hu@example.test', isAuthenticated: true });
}

test.describe('Quotes in Hungarian', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  test.beforeEach(async ({ page }) => {
    await bootHungarian(page);
  });

  test('a labor line with a fractional hour shows the Hungarian number and money formats', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);

    await quotesPage.addLine({ kind: 'labor', catalogLabel: 'LBR-DIAG - Diagnostics', quantity: '1.5' });

    await expect(toastMessage(page, 'Tétel sikeresen hozzáadva.')).toBeVisible();
    const line = quotesPage.lineRows().last();
    await expect(line.locator('[data-column="quantity"]')).toContainText('1,5');
    await expect(line.locator('[data-column="unitPrice"]')).toContainText(/(?<!\d)9000,00\s+Ft/);
    // 12 000 + 1,5 x 9 000 net.
    await expect(quotesPage.totalNet()).toContainText(/25\s500/);
    await expect(quotesPage.totalGross()).toContainText(/32\s385/);
  });

  test('a refused line shows the Hungarian field errors inline and in the toast', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(DRAFT_NUMBER);
    const editor = await quotesPage.startAddLine();

    await editor.getByTestId('quote-line-quantity-input').fill('0');
    await editor.getByTestId('quote-line-save-button').click();

    await expect(errorToastMessage(page, 'A mennyiségnek 0-nál nagyobbnak és legfeljebb 10 000-nek kell lennie.')).toBeVisible();
    await expect(editor.getByText('Válasszon a katalógusból, vagy töltse ki a megnevezést és a nettó árat.')).toHaveCount(2);
  });

  test('creating a draft without a title and then with one uses the Hungarian wording', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    const dialog = await quotesPage.gotoNewQuote(MOCK_VEHICLE_IDS.annaNxe441);

    await dialog.getByTestId('quote-create-button').click();
    await expect(errorToastMessage(page, 'Az árajánlat megnevezése kötelező.')).toBeVisible();
    await expect(dialog.getByTestId('quote-title-input')).toHaveAccessibleDescription('Az árajánlat megnevezése kötelező.');

    await dialog.getByTestId('quote-title-input').fill('Kuplungcsere');
    await dialog.getByTestId('quote-create-button').click();
    await expect(toastMessage(page, 'Piszkozat sikeresen létrehozva.')).toBeVisible();
  });

  test('a sent quote explains its lock and validity rule, and accepting toasts in Hungarian', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();
    await quotesPage.openQuote(SENT_NUMBER);

    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('ki lett küldve');
    await expect(page.getByText('Kiküldött árajánlaton az érvényesség csak későbbi dátumra tolható ki.')).toBeVisible();
    await expect(page.getByTestId('quote-accept-button')).toHaveText('Elfogadás');
    await expect(page.getByTestId('quote-reject-button')).toHaveText('Elutasítás');

    await page.getByTestId('quote-accept-button').click();
    await expect(toastMessage(page, 'Árajánlat elfogadottra állítva.')).toBeVisible();
    await expect(page.getByTestId('quote-header-locked-notice')).toContainText('el lett fogadva');
  });

  test('the delete hint and the confirmation read in Hungarian', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await expect(quotesPage.rowAction(SENT_NUMBER, 'quote-delete-button')).toHaveAttribute('title', 'Csak piszkozat törölhető.');
    await quotesPage.rowAction(DRAFT_NUMBER, 'quote-delete-button').click();

    const confirmDialog = page.getByRole('dialog', { name: 'Árajánlat törlésének megerősítése' });
    await expect(confirmDialog).toContainText('Timing belt replacement');
    await confirmDialog.getByTestId('quote-delete-confirm-button').click();
    await expect(toastMessage(page, 'Árajánlat sikeresen törölve.')).toBeVisible();
  });
});
