/** An appointment delete deletes the appointment's quotes, and a status change moves the quote lock flags and the
 * report: the Quotes and Company results reads, cached from an earlier visit, are read again on the next visit. */
import { expect, test, type Page } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { seedAppointment, todayAt } from './support/appointment-fixtures';
import { recordGetRequests } from './support/request-log';
import { signInWithMocks } from './support/sign-in';
import { MOCK_MECHANIC_IDS } from './support/test-data';
import { toastMessage } from './support/toast';

const APPOINTMENT_ID = 6871;

/** Reads of the Quotes page itself; the open detail dialog also reads the appointment's own quote list. */
function quotesPageReads(urls: readonly URL[]): readonly URL[] {
  return urls.filter((url) => !url.searchParams.has('appointmentId'));
}

interface AppointmentAction {
  readonly name: string;
  readonly run: (page: Page, scheduler: SchedulerPage) => Promise<void>;
}

const ACTIONS: readonly AppointmentAction[] = [
  {
    name: 'an appointment delete',
    run: async (page, scheduler) => {
      await scheduler.deleteButton().click();
      await page.getByRole('dialog', { name: 'Confirm appointment deletion' }).getByRole('button', { name: 'Delete appointment' }).click();
      await expect(toastMessage(page, 'Appointment deleted successfully.')).toBeVisible();
    },
  },
  {
    name: 'a status change',
    run: async (page, scheduler) => {
      await scheduler.changeAppointmentStatus('Cancelled');
      await page.getByRole('dialog', { name: 'Confirm status change' }).getByRole('button', { name: 'Change status' }).click();
      await expect(toastMessage(page, 'Appointment status updated successfully.')).toBeVisible();
      // The open dialog keeps the app shell inert, so close it before the sidebar is used.
      await scheduler.detailDialog().getByRole('button', { name: 'Close dialog' }).click();
      await expect(scheduler.detailDialog()).toHaveCount(0);
    },
  },
];

test.describe('Scheduler writes and the cached Quotes and Company results reads', () => {
  for (const action of ACTIONS) {
    test(`${action.name} makes /quotes and /company-results read again instead of serving the cache`, async ({ page }) => {
      const state = await signInWithMocks(page, { isAdmin: true });
      seedAppointment(state, { id: APPOINTMENT_ID, task: 'Cache link job', scheduledAt: todayAt(9), mechanicIds: [MOCK_MECHANIC_IDS.admin] });
      const quoteReads = recordGetRequests(page, '/api/quotes');
      const reportReads = recordGetRequests(page, '/api/company-results');
      const scheduler = new SchedulerPage(page);
      await scheduler.goto();
      const sidebar = page.locator('aside:visible');

      // Visit both pages once, so their reads are cached, and return to the scheduler without a reload.
      await sidebar.getByRole('link', { name: 'Quotes', exact: true }).click();
      await expect(page.getByTestId('quotes-search-input')).toBeVisible();
      await expect.poll(() => quotesPageReads(quoteReads).length).toBeGreaterThan(0);
      await sidebar.getByRole('link', { name: 'Company results', exact: true }).click();
      await expect(page.getByTestId('company-results-accepted')).toBeVisible();
      await expect.poll(() => reportReads.length).toBeGreaterThan(0);
      await sidebar.getByRole('link', { name: 'Scheduler', exact: true }).click();
      await scheduler.openFirstAppointmentDetail();

      await action.run(page, scheduler);
      const quoteReadsBefore = quotesPageReads(quoteReads).length;
      const reportReadsBefore = reportReads.length;

      await sidebar.getByRole('link', { name: 'Quotes', exact: true }).click();
      await expect.poll(() => quotesPageReads(quoteReads).length).toBeGreaterThan(quoteReadsBefore);
      await sidebar.getByRole('link', { name: 'Company results', exact: true }).click();
      await expect.poll(() => reportReads.length).toBeGreaterThan(reportReadsBefore);
    });
  }
});
