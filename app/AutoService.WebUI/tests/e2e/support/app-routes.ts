import type { Locator, Page } from '@playwright/test';
import { installApiMocks } from './api-mocks';
import { primeBrowserState } from './browser-state';

/** One app route a full page load is checked on, with the control that shows the page is ready. */
export interface AppRouteCheck {
  readonly path: string;
  readonly name: string;
  readonly isSignedIn: boolean;
  /** The signed-in account still has a temporary password, so this is the one page it can reach. */
  readonly mustChangePassword?: boolean;
  readonly ready: (page: Page) => Locator;
}

export const LOGIN_ROUTE: AppRouteCheck = {
  path: '/login',
  name: 'login',
  isSignedIn: false,
  ready: (page) => page.locator('#identifier'),
};

const CHANGE_PASSWORD_ROUTE: AppRouteCheck = {
  path: '/change-password',
  name: 'change password',
  isSignedIn: true,
  mustChangePassword: true,
  ready: (page) => page.locator('#change-password-current'),
};

export const CUSTOMERS_ROUTE: AppRouteCheck = {
  path: '/customers',
  name: 'customers',
  isSignedIn: true,
  ready: (page) => page.getByTestId('customers-search-input'),
};

/** Every route of the app shell that renders a page; the splash and Trusted Types specs visit them all. */
export const APP_ROUTE_CHECKS: readonly AppRouteCheck[] = [
  LOGIN_ROUTE,
  CHANGE_PASSWORD_ROUTE,
  { path: '/', name: 'scheduler', isSignedIn: true, ready: (page) => page.getByTestId('scheduler-intake-open') },
  CUSTOMERS_ROUTE,
  { path: '/quotes', name: 'quotes', isSignedIn: true, ready: (page) => page.getByTestId('quotes-search-input') },
  { path: '/inventory', name: 'inventory', isSignedIn: true, ready: (page) => page.getByTestId('inventory-parts-search-input') },
  { path: '/company-results', name: 'company results', isSignedIn: true, ready: (page) => page.getByTestId('company-results-accepted') },
  { path: '/settings', name: 'settings', isSignedIn: true, ready: (page) => page.locator('#settings-firstName') },
  { path: '/admin/register', name: 'admin', isSignedIn: true, ready: (page) => page.locator('#reg-email') },
];

/** Primes the browser and installs the API mocks the route needs: signed in as an admin, or signed out. */
export async function prepareAppRoute(page: Page, route: AppRouteCheck): Promise<void> {
  await primeBrowserState(page, { sessionHint: route.isSignedIn });
  await installApiMocks(page, {
    profileEmail: 'route.check@example.test',
    isAuthenticated: route.isSignedIn,
    isAdmin: true,
    mustChangePassword: route.mustChangePassword === true,
  });
}
