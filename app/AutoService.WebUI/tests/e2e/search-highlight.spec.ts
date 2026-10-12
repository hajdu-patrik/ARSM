/** Search match highlight (letters only, no background or weight) and the search magnifier icon on Inventory and Quotes. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CatalogPage } from './pages/catalog.page';
import { QuotesPage } from './pages/quotes.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { installApiMocks } from './support/api-mocks';

interface TextStyle {
  readonly color: string;
  readonly background: string;
  readonly weight: string;
}

const NO_BACKGROUND = 'rgba(0, 0, 0, 0)';

function readStyle(locator: Locator): Promise<TextStyle> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor, weight: style.fontWeight };
  });
}

/** A match differs from plain text in color only: no background and the same font weight. */
async function expectColorOnly(matched: Locator, plain: Locator): Promise<void> {
  const [matchedStyle, plainStyle] = await Promise.all([readStyle(matched), readStyle(plain)]);
  expect(matchedStyle.color).not.toBe(plainStyle.color);
  expect(matchedStyle.background).toBe(NO_BACKGROUND);
  expect(matchedStyle.weight).toBe(plainStyle.weight);
}

/** True when the magnifier icon is the topmost paint at its center, i.e. the input does not cover it. */
function isIconOnTop(input: Locator): Promise<boolean> {
  return input.locator('xpath=..').locator(':scope > svg').first().evaluate((icon) => {
    const box = icon.getBoundingClientRect();
    const previous = icon.style.pointerEvents;
    // The icon ignores the pointer; lift that for the hit test only.
    icon.style.pointerEvents = 'auto';
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    icon.style.pointerEvents = previous;
    return hit !== null && icon.contains(hit);
  });
}

async function expectMagnifierVisible(input: Locator): Promise<void> {
  await expect(input.locator('xpath=..').locator(':scope > svg').first()).toBeVisible();
  expect(await isIconOnTop(input)).toBe(true);
}

async function bootCatalog(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  // The part number matches the search letter for letter, so the server returns the row whose name carries the accents.
  state.parts.push({ id: 3900, partNumber: 'FEKBETET-1', name: 'Fékbetét készlet', netUnitPrice: 5000, vatRatePercent: 27, grossUnitPrice: 6350 });
  await new AuthPage(page).loginAsMechanic(env);
}

test.describe('Search highlight - parts', () => {
  test('colors only the matching letters of the name, ignoring case', async ({ page }) => {
    await bootCatalog(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');
    const rows = page.getByTestId('catalog-item-row');

    await catalog.searchInput('part').fill('brake');
    await expect(rows).toHaveCount(1);
    await expectColorOnly(rows.getByText('Brake', { exact: true }), rows.getByText('pad set', { exact: true }));
  });

  test('colors the matching part number letters', async ({ page }) => {
    await bootCatalog(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');
    const rows = page.getByTestId('catalog-item-row');

    await catalog.searchInput('part').fill('brk');
    await expect(rows).toHaveCount(1);
    await expectColorOnly(rows.getByText('BRK', { exact: true }), rows.getByText('-2002', { exact: true }));
  });

  test('matches accented letters without typing the accents', async ({ page }) => {
    await bootCatalog(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');
    const rows = page.getByTestId('catalog-item-row');

    await catalog.searchInput('part').fill('fekbetet');
    await expect(rows).toHaveCount(1);
    await expectColorOnly(rows.getByText('Fékbetét', { exact: true }), rows.getByText('készlet', { exact: true }));
  });

  test('shows the plain, uncolored text again once the search is cleared', async ({ page }) => {
    await bootCatalog(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');
    const rows = page.getByTestId('catalog-item-row');
    const name = rows.filter({ hasText: 'Brake pad set' }).getByText('Brake pad set', { exact: true });
    const plainColor = (await readStyle(name)).color;

    await catalog.searchInput('part').fill('brake');
    await expect(rows).toHaveCount(1);
    await catalog.searchClearButton('part').click();

    await expect(rows).toHaveCount(3);
    await expect(name).toBeVisible();
    expect((await readStyle(name)).color).toBe(plainColor);
  });
});

test.describe('Search highlight - labour types', () => {
  test('colors only the matching letters of the name', async ({ page }) => {
    await bootCatalog(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('labor-types');
    const rows = page.getByTestId('catalog-item-row');

    await catalog.searchInput('laborType').fill('oil');
    await expect(rows).toHaveCount(1);
    await expectColorOnly(rows.getByText('Oil', { exact: true }), rows.getByText('change', { exact: true }));
  });
});

test.describe('Search highlight - quotes', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('colors only the matching letters of the title', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);
    const quotes = new QuotesPage(page);
    await quotes.goto();

    await quotes.searchInput().fill('timing');
    await expect(quotes.rows()).toHaveCount(1);
    await expectColorOnly(quotes.rows().getByText('Timing', { exact: true }), quotes.rows().getByText('belt replacement', { exact: true }));
  });

  test('colors a matching quote number against its uncolored form', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);
    const quotes = new QuotesPage(page);
    await quotes.goto();
    const number = quotes.row('ARSM-2026-0001').getByText('ARSM-2026-0001', { exact: true });
    const plain = await readStyle(number);

    await quotes.searchInput().fill('arsm-2026-0001');
    await expect(quotes.rows()).toHaveCount(1);
    const matched = await readStyle(number);
    expect(matched.color).not.toBe(plain.color);
    expect(matched.background).toBe(NO_BACKGROUND);
    expect(matched.weight).toBe(plain.weight);
  });
});

test.describe('Search magnifier icon', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('stays visible on Inventory when the field is focused and holds text', async ({ page }) => {
    await bootCatalog(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('parts');

    await catalog.searchInput('part').focus();
    await expectMagnifierVisible(catalog.searchInput('part'));
    await catalog.searchInput('part').fill('brake');
    await expectMagnifierVisible(catalog.searchInput('part'));
  });

  test('stays visible on Quotes when the field is focused and holds text', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);
    const quotes = new QuotesPage(page);
    await quotes.goto();

    await quotes.searchInput().focus();
    await expectMagnifierVisible(quotes.searchInput());
    await quotes.searchInput().fill('timing');
    await expectMagnifierVisible(quotes.searchInput());
  });
});
