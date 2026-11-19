/** The intake dialog under in-flight requests: it stays open while its write is pending, and a lookup answer
 * that arrives after the lookup was reset is ignored. */
import { expect, test, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { lookupCustomerWithVehicle } from './support/appointment-fixtures';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { toastMessage } from './support/toast';

const BY_NAME_PATH = '/api/customers/by-name';
const INTAKE_PATH = '/api/appointments/intake';

/** A gate a route handler waits on until the spec opens it. */
function createGate(): { readonly wait: Promise<void>; readonly open: () => void } {
  let open = (): void => undefined;
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });

  return { wait, open };
}

test.describe('Scheduler intake - pending write', () => {
  test('Escape, the close button and Cancel leave the dialog open until the intake is saved', async ({ page }) => {
    await signInWithMocks(page);
    const gate = createGate();
    let writes = 0;
    await page.route((url) => url.pathname === INTAKE_PATH, async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }

      writes += 1;
      await gate.wait;
      await route.fallback();
    });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const dialog = await scheduler.openIntakeForCurrentDay();
    await scheduler.searchByLicensePlate('NXE-441');
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await dialog.getByTestId('scheduler-intake-task-description').fill('Intake held in flight');

    await scheduler.createWithCurrentForm();
    await expect.poll(() => writes).toBe(1);
    await expect(dialog.getByTestId('scheduler-intake-create')).toBeDisabled();

    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await expect(dialog).toBeVisible();

    gate.open();

    await expect(scheduler.intakeDialog()).toHaveCount(0);
    await expect(toastMessage(page, 'Intake created successfully.')).toBeVisible();
    await expect(scheduler.cardFor('Intake held in flight')).toBeVisible();
  });
});

/** Answers the first lookup once the gate opens, with a customer owning NXE-441, and every later one with no match. */
async function holdFirstLookup(page: Page, gate: ReturnType<typeof createGate>): Promise<() => number> {
  let calls = 0;
  await page.route((url) => url.pathname === BY_NAME_PATH, async (route) => {
    calls += 1;
    if (calls > 1) {
      await fulfillJson(route, []);
      return;
    }

    await gate.wait;
    await fulfillJson(route, [lookupCustomerWithVehicle({
      id: 7101,
      firstName: 'Late',
      middleName: null,
      lastName: 'Answer',
      licensePlate: 'NXE-441',
    })]);
  });

  return () => calls;
}

test.describe('Scheduler intake - lookup reset', () => {
  test('an answer that arrives after the search text changed is not shown', async ({ page }) => {
    await signInWithMocks(page);
    const gate = createGate();
    const lookupCalls = await holdFirstLookup(page, gate);
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const dialog = await scheduler.openIntakeForCurrentDay();

    await scheduler.searchByLicensePlate('NXE-441');
    await expect.poll(lookupCalls).toBe(1);
    // The new text resets the lookup; the old answer comes in before the next search has started.
    await scheduler.searchByLicensePlate('NXE-44');
    const firstAnswer = page.waitForResponse((response) => new URL(response.url()).pathname === BY_NAME_PATH);
    gate.open();
    await firstAnswer;
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    }));

    await expect(dialog.getByRole('button', { name: 'Select NXE-441' })).toHaveCount(0);
    await expect(dialog.getByText('1 matching vehicle', { exact: true })).toHaveCount(0);
    await expect.poll(lookupCalls).toBe(2);
    await expect(dialog.getByRole('button', { name: 'Select NXE-441' })).toHaveCount(0);
  });
});
