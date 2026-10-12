/** Scheduler intake customer-name suggestions: five per page with arrows, a fresh query starts at page 1,
 * and the name and plate filters exclude each other with an info note (never an error), in EN and HU. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { SchedulerPage } from './pages/scheduler.page';
import { installApiMocks } from './support/api-mocks';
import { getAppointmentFlowEnv } from './support/e2e-env';
import type { MockApiState } from './support/test-data';
import { toastRegion } from './support/toast';

const SEEDED_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SUGGESTIONS_PER_PAGE = 5;

/** Adds ten more Kovacs customers after Anna and Adam, so the name lookup finds twelve: pages of 5, 5 and 2. */
function seedKovacsCustomers(state: MockApiState): void {
  SEEDED_LETTERS.forEach((letter, index) => {
    state.schedulerLookupCustomers.push({
      id: 300 + index,
      firstName: `Seed${letter}`,
      middleName: null,
      lastName: 'Kovacs',
      email: `seed.${letter.toLowerCase()}.kovacs@example.test`,
      phoneNumber: null,
      vehicles: [],
    });
  });
}

/** Signs in with twelve Kovacs customers known to the lookup and opens the intake dialog for today. */
async function openIntake(page: Page, language: 'en' | 'hu'): Promise<{ schedulerPage: SchedulerPage; dialog: Locator }> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail });
  seedKovacsCustomers(state);
  await new AuthPage(page).loginAsMechanic(env, language);

  const schedulerPage = new SchedulerPage(page);
  await schedulerPage.goto();
  const dialog = await schedulerPage.openIntakeForCurrentDay();

  return { schedulerPage, dialog };
}

test.describe('Scheduler intake name suggestions (EN)', () => {
  test('shows five suggestions at a time with arrows, and a new query starts at page 1', async ({ page }) => {
    const { schedulerPage, dialog } = await openIntake(page, 'en');
    const { previous, next, indicator } = schedulerPage.suggestionsPagination();
    const selectButtons = dialog.getByRole('button', { name: 'Select', exact: true });

    await schedulerPage.searchByName('Kovacs');

    await expect(dialog.getByText('12 matching customers', { exact: true })).toBeVisible();
    await expect(indicator).toHaveText('1 / 3');
    await expect(selectButtons).toHaveCount(SUGGESTIONS_PER_PAGE);
    await expect(previous).toBeDisabled();
    await expect(dialog.getByText('seed.d.kovacs@example.test', { exact: true })).toHaveCount(0);

    await next.click();
    await expect(indicator).toHaveText('2 / 3');
    await expect(selectButtons).toHaveCount(SUGGESTIONS_PER_PAGE);

    await next.click();
    await expect(indicator).toHaveText('3 / 3');
    await expect(selectButtons).toHaveCount(2);
    await expect(next).toBeDisabled();

    await previous.click();
    await expect(indicator).toHaveText('2 / 3');

    await schedulerPage.searchByName('Kovac');
    await expect(indicator).toHaveText('1 / 3');
  });

  test('selects a customer from a later page', async ({ page }) => {
    const { schedulerPage, dialog } = await openIntake(page, 'en');
    const { next, indicator } = schedulerPage.suggestionsPagination();

    await schedulerPage.searchByName('Kovacs');
    await next.click();
    await next.click();
    await expect(indicator).toHaveText('3 / 3');

    await dialog.getByRole('button', { name: 'Select', exact: true }).first().click();

    await expect(dialog.getByText('Existing customer selected')).toBeVisible();
    await expect(dialog.getByText('seed.i.kovacs@example.test')).toBeVisible();
  });

  test('the name and plate filters exclude each other with an info note, not an error', async ({ page }) => {
    const { schedulerPage, dialog } = await openIntake(page, 'en');
    const nameInput = dialog.getByTestId('scheduler-intake-name-lookup');
    const plateInput = dialog.getByTestId('scheduler-intake-license-plate-lookup');
    const note = dialog.getByTestId('scheduler-intake-single-filter-note');

    await expect(note).toHaveCount(0);
    await schedulerPage.searchByName('Kovacs');

    await expect(plateInput).toBeDisabled();
    await expect(nameInput).toBeEnabled();
    await expect(note).toHaveText('Only one filter can be used at a time.');
    await expect(note).not.toHaveAttribute('role', 'alert');
    await expect(nameInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(plateInput).toHaveAttribute('aria-describedby', (await note.getAttribute('id')) ?? '');
    await expect(toastRegion(page).getByRole('alert')).toHaveCount(0);

    await nameInput.fill('');
    await expect(plateInput).toBeEnabled();
    await expect(note).toHaveCount(0);

    await schedulerPage.searchByLicensePlate('NXE-441');
    await expect(nameInput).toBeDisabled();
    await expect(note).toHaveText('Only one filter can be used at a time.');
  });
});

test.describe('Scheduler intake name suggestions (HU)', () => {
  test('localizes the arrows and the one-filter info note', async ({ page }) => {
    const { schedulerPage, dialog } = await openIntake(page, 'hu');
    const { previous, next, indicator } = schedulerPage.suggestionsPagination();

    await schedulerPage.searchByName('Kovacs');

    await expect(dialog.getByText('12 ügyfél találat', { exact: true })).toBeVisible();
    await expect(indicator).toHaveText('1 / 3');
    await expect(dialog.getByRole('button', { name: 'Kiválasztás', exact: true })).toHaveCount(SUGGESTIONS_PER_PAGE);
    await expect(previous).toHaveAccessibleName('Előző oldal');
    await expect(next).toHaveAccessibleName('Következő oldal');

    const note = dialog.getByTestId('scheduler-intake-single-filter-note');
    await expect(dialog.getByTestId('scheduler-intake-license-plate-lookup')).toBeDisabled();
    await expect(note).toHaveText('Egyszerre csak egy szűrő használható.');
    await expect(note).not.toHaveAttribute('role', 'alert');
    await expect(toastRegion(page).getByRole('alert')).toHaveCount(0);
  });
});
