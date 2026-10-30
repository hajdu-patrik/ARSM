/** App shell: the sidebar links per role, collapse and its saved state, the tablet default, the phone drawer,
 * the skip link, the profile summary and the shell's language switch. */
import { expect, test, type Page } from '@playwright/test';
import { PREF_SIDEBAR_COLLAPSED_KEY } from '../../src/utils/browserStorageKeys';
import { installApiMocks, type InstallApiMockOptions } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import type { MockApiState } from './support/test-data';

const COLLAPSED_WIDTH_PX = 68;
const EXPANDED_WIDTH_PX = 256;

async function openApp(page: Page, options: Partial<InstallApiMockOptions> = {}, path = '/'): Promise<MockApiState> {
  await primeBrowserState(page, { sessionHint: true });
  const state = await installApiMocks(page, { profileEmail: 'shell.sidebar@example.test', ...options });
  await page.goto(path);
  await expect(page.getByRole('main')).toBeVisible();
  return state;
}

function desktopSidebar(page: Page) {
  return page.locator('aside:visible');
}

test.describe('Sidebar links', () => {
  test('a mechanic is offered the five pages and Settings, and no Admin link', async ({ page }) => {
    await openApp(page, { isAdmin: false });
    const sidebar = desktopSidebar(page);

    for (const name of ['Scheduler', 'Customers', 'Quotes', 'Inventory', 'Company results', 'Settings']) {
      await expect(sidebar.getByRole('link', { name })).toBeVisible();
    }
    await expect(sidebar.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });

  test('an admin also gets the Admin link, which opens the registration page', async ({ page }) => {
    await openApp(page, { isAdmin: true });

    await desktopSidebar(page).getByRole('link', { name: 'Admin' }).click();

    await expect(page).toHaveURL(/\/admin\/register$/);
    await expect(page.locator('#reg-email')).toBeVisible();
  });

  test('a link opens its page and is marked as the current one', async ({ page }) => {
    await openApp(page);
    const customers = desktopSidebar(page).getByRole('link', { name: 'Customers' });

    await customers.click();

    await expect(page).toHaveURL(/\/customers$/);
    await expect(customers).toHaveAttribute('aria-current', 'page');
    await expect(desktopSidebar(page).getByRole('link', { name: 'Quotes' })).not.toHaveAttribute('aria-current', 'page');
  });

  test('the shell language switch translates the sidebar and keeps the page', async ({ page }) => {
    await openApp(page);

    await page.getByTestId('theme-language-toggle').click();

    await expect(page).toHaveURL(/\/$/);
    await expect(desktopSidebar(page).getByRole('link', { name: 'Ügyfelek' })).toBeVisible();
    await expect(desktopSidebar(page).getByRole('button', { name: 'Kijelentkezés' })).toBeVisible();
  });
});

test.describe('Sidebar collapse', () => {
  test('toggles between the wide and the icon rail and saves the choice', async ({ page }) => {
    await openApp(page);
    const sidebar = desktopSidebar(page);
    const collapse = sidebar.getByRole('button', { name: 'Collapse menu' });

    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(EXPANDED_WIDTH_PX);

    await collapse.click();

    const expand = sidebar.getByRole('button', { name: 'Expand menu' });
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(COLLAPSED_WIDTH_PX);
    expect(await page.evaluate((key) => localStorage.getItem(key), PREF_SIDEBAR_COLLAPSED_KEY)).toBe('true');

    await expand.click();

    await expect(sidebar.getByRole('button', { name: 'Collapse menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate((key) => localStorage.getItem(key), PREF_SIDEBAR_COLLAPSED_KEY)).toBe('false');
  });

  test('starts collapsed when that was saved', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true, sidebarCollapsed: true });
    await installApiMocks(page, { profileEmail: 'shell.collapsed@example.test' });

    await page.goto('/');

    const sidebar = desktopSidebar(page);
    await expect(sidebar.getByRole('button', { name: 'Expand menu' })).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(COLLAPSED_WIDTH_PX);
  });

  test('with nothing saved the tablet width starts as the icon rail and a laptop width as the wide menu', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, PREF_SIDEBAR_COLLAPSED_KEY);
    await installApiMocks(page, { profileEmail: 'shell.tablet@example.test' });
    await page.setViewportSize({ width: 800, height: 900 });

    await page.goto('/');
    await expect(desktopSidebar(page).getByRole('button', { name: 'Expand menu' })).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(desktopSidebar(page).getByRole('button', { name: 'Collapse menu' })).toBeVisible();
  });
});

test.describe('Phone drawer at 320px', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test('the menu button opens the drawer, a link closes it and the overlay dismisses it', async ({ page }) => {
    await openApp(page);
    const openMenu = page.getByRole('button', { name: 'Open menu' });
    const drawerNav = page.getByRole('navigation', { name: 'Main navigation' });

    await expect(drawerNav).toHaveCount(0);
    await expect(openMenu).toHaveAttribute('aria-expanded', 'false');

    await openMenu.click();
    await expect(openMenu).toHaveAttribute('aria-expanded', 'true');
    await expect(drawerNav.getByRole('link', { name: 'Customers' })).toBeVisible();

    await drawerNav.getByRole('link', { name: 'Customers' }).click();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(openMenu).toHaveAttribute('aria-expanded', 'false');
    await expect(drawerNav).toHaveCount(0);

    await openMenu.click();
    // The drawer covers the overlay's centre, so click its free strip on the right edge.
    await page.getByRole('button', { name: 'Close menu' }).click({ position: { x: 310, y: 350 } });
    await expect(openMenu).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Skip link and profile summary', () => {
  test('the first Tab reaches the skip link, which moves focus to the content without changing the URL', async ({ page }) => {
    await openApp(page);

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page.locator('#main-content')).toBeFocused();
    expect(new URL(page.url()).hash).toBe('');
  });

  test('shows the name, the email and the initials of the signed-in person', async ({ page }) => {
    await openApp(page, { profileEmail: 'shell.summary@example.test' });
    const sidebar = desktopSidebar(page);

    await expect(sidebar.getByText('E2E Mechanic', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('shell.summary@example.test', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('EM', { exact: true })).toBeVisible();
  });

  test('without a name the initials are the first two letters of the email and no name line is shown', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    const state = await installApiMocks(page, { profileEmail: 'zq.nameless@example.test' });
    state.profile.firstName = '';
    state.profile.lastName = '';

    await page.goto('/');

    const sidebar = desktopSidebar(page);
    await expect(sidebar.getByText('ZQ', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('zq.nameless@example.test', { exact: true })).toBeVisible();
  });

  test('shows the stored picture instead of the initials', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    const state = await installApiMocks(page, { profileEmail: 'shell.picture@example.test' });
    state.profile.hasProfilePicture = true;

    await page.goto('/');

    const picture = desktopSidebar(page).getByRole('img', { name: 'Profile picture' });
    await expect(picture).toBeVisible();
    await expect.poll(() => picture.evaluate((element) => (element instanceof HTMLImageElement ? element.naturalWidth : 0))).toBeGreaterThan(0);
    await expect(desktopSidebar(page).getByText('EM', { exact: true })).toHaveCount(0);
  });

  test('falls back to the initials when the picture cannot be loaded', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    const state = await installApiMocks(page, {
      profileEmail: 'shell.nopicture@example.test',
      routeFailures: { 'GET /api/profile/picture': { status: 404, body: {}, repeat: true } },
    });
    state.profile.hasProfilePicture = true;

    await page.goto('/');

    await expect(desktopSidebar(page).getByText('EM', { exact: true })).toBeVisible();
  });
});
