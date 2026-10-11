/** Hungarian wording: one name per concept (Árajánlat, Katalógus, Munkadíjtípus, Időpont, Kiküldött), the
 * adjective status forms, ÁFA and the YYYY. MM. DD. date. The English wording is asserted by the feature specs. */
import { expect, test } from '@playwright/test';
import { CatalogPage } from './pages/catalog.page';
import { QuotesPage } from './pages/quotes.page';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

test.describe('Hungarian wording', () => {
  // A fixed zone, so the fixture instants render the same calendar day on every machine.
  test.use({ timezoneId: 'UTC' });

  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { language: 'hu', sessionHint: true });
    await installApiMocks(page, { profileEmail: 'mechanic.hu@example.test', isAuthenticated: true });
  });

  test('names the quote Árajánlat, with the status forms Piszkozat, Kiküldött, Lejárt, Elfogadott, Elutasított', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    await quotesPage.goto();

    await expect(page.getByRole('heading', { name: 'Árajánlatok', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Árajánlatok', exact: true })).toBeVisible();
    await expect(page.getByTestId('data-list-header')).toContainText('Árajánlat');

    await expect(quotesPage.statusBadge('ARSM-2026-0001')).toHaveText('Piszkozat');
    await expect(quotesPage.statusBadge('ARSM-2026-0002')).toHaveText('Kiküldött');
    await expect(quotesPage.statusBadge('ARSM-2026-0003')).toHaveText('Lejárt');
    await expect(quotesPage.statusFilter().locator('option')).toHaveText([
      'Minden állapot',
      'Piszkozat',
      'Kiküldött',
      'Lejárt',
      'Elfogadott',
      'Elutasított',
    ]);

    // The validity date reads YYYY. MM. DD. (the fixture is valid until 2099-12-31T23:59:59Z).
    await expect(quotesPage.row('ARSM-2026-0001')).toContainText('2099. 12. 31.');
  });

  test('calls the catalogue Katalógus, its labour kinds Munkadíjtípus and the tax ÁFA', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto('labor-types');

    await expect(page.getByRole('heading', { name: 'Katalógus', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Katalógus', exact: true })).toBeVisible();
    await expect(catalogPage.tab('parts')).toHaveText('Alkatrészek');
    await expect(catalogPage.tab('labor-types')).toHaveText('Munkadíjtípusok');
    await expect(catalogPage.createButton('laborType')).toHaveText('Munkadíjtípus létrehozása');
    await expect(page.getByTestId('data-list-header')).toContainText('ÁFA');
  });

  test('labels the report rows Elfogadott, Kiküldött, Lejárt and Elutasított', async ({ page }) => {
    await page.goto('/company-results');
    await expect(page.getByTestId('company-results-accepted')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Cégeredmény', level: 1 })).toBeVisible();
    await expect(page.getByTestId('company-results-accepted')).toContainText('Elfogadott');
    await expect(page.getByTestId('company-results-pending')).toContainText('Kiküldött');
    await expect(page.getByTestId('company-results-expired')).toContainText('Lejárt');
    await expect(page.getByTestId('company-results-rejected')).toContainText('Elutasított');
    await expect(page.getByRole('heading', { name: 'Elfogadott árajánlatok ÁFA-bontása' })).toBeVisible();
  });

  test('calls an appointment Időpont and leads a missing page back to the scheduler', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();

    await expect(page.getByRole('region', { name: 'Havi időpontok' })).toBeVisible();
    await expect(page.getByText('0 időpont', { exact: true })).toBeVisible();

    await page.goto('/nincs-ilyen-oldal');
    await expect(page.getByRole('button', { name: 'Ugrás az ütemezőhöz' })).toBeVisible();
  });
});
