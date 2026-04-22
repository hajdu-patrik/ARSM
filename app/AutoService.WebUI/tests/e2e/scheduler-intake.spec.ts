import { expect, test, type Response } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

function matchesApiPath(response: Response, method: string, pathSuffix: string): boolean {
  return response.request().method() === method
    && new URL(response.url()).pathname.endsWith(pathSuffix);
}

test.describe('Scheduler intake creation', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('create intake with existing customer and existing vehicle', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.selectTodayCalendarDay();
    await scheduler.openIntakeModal();

    const lookupPromise = page.waitForResponse(
      (r) => matchesApiPath(r, 'GET', '/api/customers/by-email') && r.status() === 200,
    );
    await scheduler.lookupCustomerByEmail(env.existingCustomerEmail);
    await lookupPromise;

    await scheduler.selectFirstExistingVehicle();

    const taskDescription = `Playwright intake ${Date.now()}`;
    await scheduler.fillTaskDescription(taskDescription);

    const createPromise = page.waitForResponse(
      (r) => matchesApiPath(r, 'POST', '/api/appointments/intake') && r.status() >= 200 && r.status() < 300,
    );
    await scheduler.createIntake();
    const createResponse = await createPromise;
    const body = await createResponse.json() as { id: number; taskDescription: string };

    expect(body.id).toBeGreaterThan(0);
    expect(body.taskDescription).toBe(taskDescription);

    await expect(page.getByRole('dialog', { name: 'New Intake' })).toBeHidden();
  });

  test('intake button disabled when no day is selected', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.navigateNextMonth();
    await page.waitForTimeout(500);

    await scheduler.expectIntakeButtonDisabled();
  });

  test('customer lookup not-found shows create fields', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    await scheduler.selectTodayCalendarDay();
    await scheduler.openIntakeModal();

    const lookupPromise = page.waitForResponse(
      (r) => r.url().includes('/api/customers/by-email') && (r.status() === 404 || r.status() === 200),
    );
    await scheduler.lookupCustomerByEmail(`nonexistent_${Date.now()}@playwright.test`);
    await lookupPromise;

    await page.waitForTimeout(1_000);
    const notFoundIndicator = page.getByText(/not found|new customer|create/i);
    const isVisible = await notFoundIndicator.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });
});
