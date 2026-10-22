import type { Page } from '@playwright/test';

/** Records the URL of every GET to the path, so a test can read the query the page sent. */
export function recordGetRequests(page: Page, pathname: string): URL[] {
  const urls: URL[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === pathname) {
      urls.push(url);
    }
  });

  return urls;
}
