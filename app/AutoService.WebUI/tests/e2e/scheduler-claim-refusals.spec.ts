/** What a mechanic is told when the API refuses a claim or a self-unassign: a lost race, a cancelled appointment, a plain failure. */
import { expect, test, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { refuseApiRoute } from './support/appointment-route-overrides';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

const { gabor, peter } = MOCK_MECHANIC_IDS;
const CLAIM_PATH = '/api/appointments/6801/claim';
const RACE_MESSAGE = 'This appointment assignment changed in the meantime. Refresh and try again.';

interface UnassignRefusal {
  readonly name: string;
  readonly status: number;
  readonly body: unknown;
  readonly message: string;
}

const UNASSIGN_REFUSALS: readonly UnassignRefusal[] = [
  { name: 'a mechanic who is no longer assigned', status: 409, body: { code: 'not_assigned' }, message: RACE_MESSAGE },
  { name: 'the last mechanic', status: 422, body: { code: 'last_assigned_mechanic' }, message: RACE_MESSAGE },
  { name: 'a completed appointment', status: 422, body: { code: 'appointment_completed' }, message: RACE_MESSAGE },
  {
    name: 'a cancelled appointment',
    status: 422,
    body: { code: 'appointment_cancelled' },
    message: 'You cannot unassign from a cancelled appointment.',
  },
  { name: 'an appointment that is gone', status: 404, body: { code: 'appointment_not_found' }, message: 'Failed to unassign.' },
];

/** Signs in as a plain mechanic and lists one open appointment of Peter, optionally shared with Gabor. */
async function openCard(page: Page, mechanicIds: readonly number[]): Promise<SchedulerPage> {
  const state = await signInWithMocks(page);
  seedAppointment(state, { id: 6801, task: 'Refused claim', scheduledAt: todayAt(9), mechanicIds });
  const scheduler = new SchedulerPage(page);
  await scheduler.goto();

  return scheduler;
}

test.describe('Scheduler refused claim', () => {
  test('toasts the failure and does not report a claim', async ({ page }) => {
    const scheduler = await openCard(page, [peter]);
    await refuseApiRoute(page, CLAIM_PATH, 'PUT', 409, { code: 'already_claimed' });

    await scheduler.cardFor('Refused claim').getByRole('button', { name: 'Claim', exact: true }).click();
    await page.getByRole('dialog', { name: 'Confirm claim' }).getByRole('button', { name: 'Claim', exact: true }).click();

    await expect(errorToastMessage(page, 'Failed to claim appointment.')).toBeVisible();
    await expect(toastMessage(page, 'Appointment claimed successfully.')).toHaveCount(0);
  });
});

test.describe('Scheduler refused self-unassign', () => {
  for (const refusal of UNASSIGN_REFUSALS) {
    test(`tells the reason for ${refusal.name}`, async ({ page }) => {
      const scheduler = await openCard(page, [gabor, peter]);
      await refuseApiRoute(page, CLAIM_PATH, 'DELETE', refusal.status, refusal.body);

      await scheduler.cardFor('Refused claim').getByRole('button', { name: 'Unassign me', exact: true }).click();
      await page.getByRole('dialog', { name: 'Confirm unassign' }).getByRole('button', { name: 'Unassign', exact: true }).click();

      await expect(errorToastMessage(page, refusal.message)).toBeVisible();
      await expect(toastMessage(page, 'You were unassigned successfully.')).toHaveCount(0);
    });
  }
});
