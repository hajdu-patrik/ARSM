/** Head metadata per route: the page title, the noindex directive, the canonical URL and html[lang], in English
 * and Hungarian, for every known route and for an unknown one. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { APP_ROUTE_CHECKS, prepareAppRoute } from './support/app-routes';
import { primeBrowserState } from './support/browser-state';

const ENGLISH_TITLES: Readonly<Record<string, string>> = {
  '/login': 'Secure login',
  '/change-password': 'Set a new password',
  '/': 'Workshop scheduler',
  '/customers': 'Customer and vehicle management',
  '/quotes': 'Price quotes',
  '/inventory': 'Parts and labour catalogue',
  '/company-results': 'Company results',
  '/settings': 'Profile and security settings',
  '/admin/register': 'Mechanic registration',
};

function metaContent(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).getAttribute('content');
}

test.describe('Head metadata per route', () => {
  for (const route of APP_ROUTE_CHECKS) {
    test(`${route.name}: title, noindex and canonical`, async ({ page }) => {
      await prepareAppRoute(page, route);

      await page.goto(route.path);
      await expect(route.ready(page)).toBeVisible();

      await expect(page).toHaveTitle(`${ENGLISH_TITLES[route.path] ?? 'missing title'} | ARSM`);
      expect(await metaContent(page, 'meta[name="robots"]')).toMatch(/^noindex, nofollow/);
      expect(await metaContent(page, 'meta[name="googlebot"]')).toMatch(/^noindex, nofollow/);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical ?? '').pathname).toBe(route.path);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    });
  }

  test('a trailing slash and the scheduler aliases keep the route title and canonical', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, { profileEmail: 'seo.alias@example.test' });

    await page.goto('/customers/');
    await expect(page).toHaveTitle('Customer and vehicle management | ARSM');
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href')) ?? '').pathname).toBe('/customers');

    await page.goto('/dashboard');
    await expect(page).toHaveTitle('Workshop scheduler | ARSM');
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href')) ?? '').pathname).toBe('/');
  });

  test('an unknown route is titled as not found and canonical to /404', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false });
    await installApiMocks(page, { profileEmail: 'seo.unknown@example.test', isAuthenticated: false });

    await page.goto('/no-such-page');

    await expect(page).toHaveTitle('Page not found | ARSM');
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href')) ?? '').pathname).toBe('/404');
    expect(await metaContent(page, 'meta[name="robots"]')).toMatch(/^noindex, nofollow/);
  });

  test('the server-error page is titled Server error', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false });
    await installApiMocks(page, { profileEmail: 'seo.server@example.test', isAuthenticated: false });

    await page.goto('/500');

    await expect(page).toHaveTitle('Server error | ARSM');
  });
});

test.describe('Head metadata in Hungarian', () => {
  test('the title, the html language and the Open Graph locale follow the language', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false, language: 'hu' });
    await installApiMocks(page, { profileEmail: 'seo.hu@example.test', isAuthenticated: false });

    await page.goto('/login');

    await expect(page).toHaveTitle('Biztonságos bejelentkezés | ARSM');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');
    expect(await metaContent(page, 'meta[property="og:locale"]')).toBe('hu_HU');
    expect(await metaContent(page, 'meta[property="og:title"]')).toBe('Biztonságos bejelentkezés | ARSM');
  });

  test('switching the language retitles the page at once', async ({ page }) => {
    await primeBrowserState(page, { sessionHint: false, language: 'en' });
    await installApiMocks(page, { profileEmail: 'seo.switch@example.test', isAuthenticated: false });
    await page.goto('/login');
    await expect(page).toHaveTitle('Secure login | ARSM');

    await page.getByTestId('theme-language-toggle').click();

    await expect(page).toHaveTitle('Biztonságos bejelentkezés | ARSM');
    expect(await metaContent(page, 'meta[property="og:locale"]')).toBe('hu_HU');
  });
});
