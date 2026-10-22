/** The scheduler derives today's appointments from the months it reads: it never calls the today endpoint, reads
 * three months while today's month is in the viewed window, and the real current month as a fourth once it is not. */
import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';

/** `year-month` of the month that lies `offset` months from the current one. */
function monthKey(offset: number): string {
  const date = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);

  return `${String(date.getFullYear())}-${String(date.getMonth() + 1)}`;
}

/** Opens the scheduler (optionally viewing another month) and returns the months it reads and the route log. */
async function openScheduler(page: Page, viewedOffset: number): Promise<{ months: Set<string>; routeCallLog: string[] }> {
  const months = new Set<string>();
  const routeCallLog: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/appointments') {
      months.add(`${url.searchParams.get('year') ?? ''}-${url.searchParams.get('month') ?? ''}`);
    }
  });

  await primeBrowserState(page, { sessionHint: true });
  await installApiMocks(page, { profileEmail: 'scheduler.reads@example.test', isAuthenticated: true, routeCallLog });
  const [year, month] = monthKey(viewedOffset).split('-').map(Number);
  await page.addInitScript((view) => {
    sessionStorage.setItem('scheduler-selected-view', JSON.stringify(view));
  }, { year, month, day: null });

  await page.goto('/');
  await expect(page.getByTestId('scheduler-intake-open')).toBeVisible();

  return { months, routeCallLog };
}

test.describe('Scheduler month reads', () => {
  test('reads the three months of the window and no today endpoint while today is inside it', async ({ page }) => {
    const { months, routeCallLog } = await openScheduler(page, 0);

    await expect.poll(() => [...months].sort()).toEqual([monthKey(-1), monthKey(0), monthKey(1)].sort());
    expect(routeCallLog).not.toContain('GET /api/appointments/today');
  });

  test('reads the real current month as a fourth one once another month is viewed', async ({ page }) => {
    const { months, routeCallLog } = await openScheduler(page, 3);

    await expect.poll(() => [...months].sort()).toEqual([monthKey(0), monthKey(2), monthKey(3), monthKey(4)].sort());
    expect(routeCallLog).not.toContain('GET /api/appointments/today');
  });
});
