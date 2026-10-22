/** Route path table: the router, the guards, the sidebar, SEO and the loading splash all read it,
 * so a route cannot be known to one of them and missing from another. */

import { matchPath } from 'react-router';

/** Path of every app route; `schedulerAlias` and `dashboardAlias` redirect to the scheduler at `scheduler`. */
export const APP_ROUTE_PATHS = {
  login: '/login',
  changePassword: '/change-password',
  scheduler: '/',
  schedulerAlias: '/scheduler',
  dashboardAlias: '/dashboard',
  customers: '/customers',
  quotes: '/quotes',
  inventory: '/inventory',
  companyResults: '/company-results',
  adminRegister: '/admin/register',
  settings: '/settings',
  serverError: '/500',
} as const;

/** Paths whose full page load shows the loading splash: every route of the table except the server-error page. */
const SPLASH_ROUTE_PATHS: readonly string[] = Object.values(APP_ROUTE_PATHS).filter(
  (path) => path !== APP_ROUTE_PATHS.serverError,
);

/** Whether a full load of the pathname shows the splash; like the router, it ignores case and a trailing slash. */
export function isSplashRoute(pathname: string): boolean {
  return SPLASH_ROUTE_PATHS.some((path) => matchPath(path, pathname) !== null);
}
