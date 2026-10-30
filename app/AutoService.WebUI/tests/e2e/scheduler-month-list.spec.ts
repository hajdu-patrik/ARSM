/** The monthly appointment list: cards with status, due state and mechanics, the status and mechanic filters,
 * the date sort and the three empty states, in English and Hungarian. */
import { expect, test, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { DAY_MS, onDayOfCurrentMonth, otherDayOfCurrentMonth, seedAppointment, todayAt } from './support/appointment-fixtures';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS, type MockApiState } from './support/test-data';
import type { TestLanguage } from './support/browser-state';

const { gabor, peter, mate } = MOCK_MECHANIC_IDS;
const CARD_TASKS = /^Card task /;

/** Five appointments today: open with a due time left, open and overdue, completed, cancelled with three mechanics, and a placeholder mechanic. */
function seedCards(state: MockApiState): void {
  const now = Date.now();
  seedAppointment(state, { id: 6401, task: 'Card task A', scheduledAt: todayAt(8), dueAt: new Date(now + 5 * 60 * 60 * 1000), mechanicIds: [peter] });
  seedAppointment(state, { id: 6402, task: 'Card task B', scheduledAt: todayAt(10), dueAt: new Date(now - 2 * DAY_MS), mechanicIds: [peter, mate] });
  seedAppointment(state, { id: 6403, status: 'Completed', task: 'Card task C', scheduledAt: todayAt(12), mechanicIds: [mate] });
  seedAppointment(state, { id: 6404, status: 'Cancelled', task: 'Card task D', scheduledAt: todayAt(14), mechanicIds: [gabor, peter, mate] });
  seedAppointment(state, {
    id: 6405,
    task: 'Card task E',
    scheduledAt: todayAt(16),
    extraMechanics: [{ id: 9991, fullName: 'Unknown', specialization: 'All', hasProfilePicture: false }],
  });
}

async function openList(page: Page, language: TestLanguage = 'en'): Promise<SchedulerPage> {
  const state = await signInWithMocks(page, {}, language);
  seedCards(state);
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return scheduler;
}

test.describe('Scheduler month list - cards', () => {
  test('lists the day in time order with the status, vehicle, due state and mechanics of each appointment', async ({ page }) => {
    const scheduler = await openList(page);

    await expect(scheduler.cardTasks(CARD_TASKS)).toHaveText(['Card task A', 'Card task B', 'Card task C', 'Card task D', 'Card task E']);
    const cardA = scheduler.cardFor('Card task A');
    const cardB = scheduler.cardFor('Card task B');
    const cardC = scheduler.cardFor('Card task C');
    const cardD = scheduler.cardFor('Card task D');

    await expect(cardA.getByTestId('appointment-status-badge')).toContainText('In progress');
    await expect(cardC.getByTestId('appointment-status-badge')).toContainText('Completed');
    await expect(cardD.getByTestId('appointment-status-badge')).toContainText('Cancelled');
    await expect(cardA.getByRole('heading', { name: 'Volkswagen Golf (2018)' })).toBeVisible();
    await expect(cardA.getByText('NXE-441', { exact: true })).toBeVisible();

    await expect(cardA.locator('p', { hasText: /^0 days \d+h \d+m left$/ })).toHaveClass(/text-ui-warning-text/);
    await expect(cardB.locator('p', { hasText: /^Overdue by 2 days \d+h \d+m$/ })).toHaveClass(/text-arsm-error-text/);
    await expect(cardC.locator('p', { hasText: /^Completed$/ })).toHaveClass(/text-ui-success-text/);
    await expect(cardD.locator('p', { hasText: /^Cancelled$/ })).toHaveClass(/text-arsm-error-text/);

    await expect(cardB.getByRole('img', { name: 'Peter Nagy' })).toBeVisible();
    await expect(cardB.getByRole('img', { name: 'Mate Szabo' })).toBeVisible();
    await expect(cardD.getByRole('img')).toHaveCount(2);
    await expect(cardD.getByText('+1', { exact: true })).toBeVisible();
  });

  test('sorts by date, ascending first, and flips the order', async ({ page }) => {
    const scheduler = await openList(page);

    await scheduler.monthList().getByRole('button', { name: 'Date ascending' }).click();

    await expect(scheduler.monthList().getByRole('button', { name: 'Date descending' })).toBeVisible();
    await expect(scheduler.cardTasks(CARD_TASKS)).toHaveText(['Card task E', 'Card task D', 'Card task C', 'Card task B', 'Card task A']);
  });
});

test.describe('Scheduler month list - filters', () => {
  test('filters by status chips, which add up, and by mechanic, which leaves out placeholder names', async ({ page }) => {
    const scheduler = await openList(page);
    const list = scheduler.monthList();
    const chip = (name: string) => list.getByRole('button', { name, exact: true });

    await expect(chip('Completed')).toHaveAttribute('aria-pressed', 'false');
    await chip('Cancelled').click();
    await expect(chip('Cancelled')).toHaveAttribute('aria-pressed', 'true');
    await expect(scheduler.cardTasks(CARD_TASKS)).toHaveText(['Card task D']);
    await expect(list.getByText('1 appointment', { exact: true })).toBeVisible();

    await chip('Completed').click();
    await expect(scheduler.cardTasks(CARD_TASKS)).toHaveText(['Card task C', 'Card task D']);
    await chip('Cancelled').click();
    await chip('Completed').click();
    await expect(scheduler.appointmentCards()).toHaveCount(5);

    const mechanicFilter = list.getByRole('combobox', { name: 'All mechanics' });
    await mechanicFilter.click();
    await expect(page.getByRole('option')).toHaveText(['All mechanics', 'Gabor Kovacs', 'Mate Szabo', 'Peter Nagy']);
    await page.keyboard.press('Escape');
    await selectDropdownOptionByLabel(page, mechanicFilter, 'Peter Nagy');
    await expect(scheduler.cardTasks(CARD_TASKS)).toHaveText(['Card task A', 'Card task B', 'Card task D']);
    await expect(list.getByText('3 appointments', { exact: true })).toBeVisible();

    await chip('Completed').click();
    await expect(scheduler.appointmentCards()).toHaveCount(0);
    await expect(list.getByText('No appointments match the filters', { exact: true })).toBeVisible();

    await chip('Completed').click();
    await selectDropdownOptionByLabel(page, mechanicFilter, 'All mechanics');
    await expect(scheduler.appointmentCards()).toHaveCount(5);
  });
});

test.describe('Scheduler month list - empty states', () => {
  test('says whether the day or the month holds no appointment', async ({ page }) => {
    const state = await signInWithMocks(page);
    seedAppointment(state, { id: 6411, task: 'Elsewhere job', scheduledAt: onDayOfCurrentMonth(otherDayOfCurrentMonth(), 9) });
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();
    const list = scheduler.monthList();

    await expect(list.getByText('No appointments on this day', { exact: true })).toBeVisible();
    await expect(list.getByText('0 appointments', { exact: true })).toBeVisible();

    await list.getByRole('button', { name: 'Show all' }).click();
    await expect(list.getByText('No appointments on this day', { exact: true })).toHaveCount(0);
    await expect(scheduler.cardFor('Elsewhere job')).toBeVisible();
  });

  test('says the month holds no appointment when none exists at all', async ({ page }) => {
    await signInWithMocks(page);
    const scheduler = new SchedulerPage(page);
    await scheduler.goto();

    await scheduler.monthList().getByRole('button', { name: 'Show all' }).click();

    await expect(scheduler.monthList().getByText('No appointments this month', { exact: true })).toBeVisible();
    await expect(scheduler.monthList().getByText('0 appointments', { exact: true })).toBeVisible();
  });
});

test.describe('Scheduler month list - Hungarian', () => {
  test('uses the Hungarian status, due, filter and sort wording', async ({ page }) => {
    const scheduler = await openList(page, 'hu');
    const list = scheduler.monthList();

    await expect(page.getByText('5 ütemezett időpont', { exact: true })).toBeVisible();
    await expect(list.getByText('5 időpont', { exact: true })).toBeVisible();
    await expect(list.getByRole('button', { name: 'Dátum növekvő' })).toBeVisible();
    await expect(list.getByRole('button', { name: 'Folyamatban', exact: true })).toBeVisible();
    await expect(scheduler.cardFor('Card task C').locator('p', { hasText: /^Befejezve$/ })).toBeVisible();
    await expect(scheduler.cardFor('Card task D').locator('p', { hasText: /^Lemondva$/ })).toBeVisible();
    await expect(scheduler.cardFor('Card task B').locator('p', { hasText: /^\d+ nap \d+ó \d+p késés$/ })).toBeVisible();

    await list.getByRole('button', { name: 'Befejezett', exact: true }).click();
    await selectDropdownOptionByLabel(page, list.getByRole('combobox', { name: 'Összes szerelő' }), 'Gabor Kovacs');
    await expect(list.getByText('Nincs a szűrésnek megfelelő időpont', { exact: true })).toBeVisible();
  });
});
