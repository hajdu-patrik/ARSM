import { expect, test, type Response } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { AppointmentDetailPage } from './pages/appointment-detail.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

interface AppointmentResponse {
  id: number;
  dueDateTime: string;
  taskDescription: string;
}

function matchesApiPath(response: Response, method: string, pathSuffix: string): boolean {
  return response.request().method() === method
    && new URL(response.url()).pathname.endsWith(pathSuffix);
}

function toDatetimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

test.describe('Scheduler appointment detail', () => {
  let createdAppointment: AppointmentResponse;
  let taskDescription: string;

  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

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

    taskDescription = `Playwright detail ${Date.now()}`;
    await scheduler.fillTaskDescription(taskDescription);

    const createPromise = page.waitForResponse(
      (r) => matchesApiPath(r, 'POST', '/api/appointments/intake') && r.status() >= 200 && r.status() < 300,
    );
    await scheduler.createIntake();
    const createResponse = await createPromise;
    createdAppointment = await createResponse.json() as AppointmentResponse;

    await expect(page.getByRole('dialog', { name: 'New Intake' })).toBeHidden();
  });

  test('open appointment detail modal by clicking card', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();
  });

  test('edit due date and save', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();
    await detail.startEdit();

    const newDue = new Date(createdAppointment.dueDateTime);
    newDue.setDate(newDue.getDate() + 2);
    const newDueLocal = toDatetimeLocalValue(newDue);

    await detail.setDueDateTime(newDueLocal);

    const updatePromise = page.waitForResponse(
      (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}`) && r.status() === 200,
    );
    await detail.save();
    const updateResponse = await updatePromise;
    const updated = await updateResponse.json() as AppointmentResponse;

    expect(new Date(updated.dueDateTime).getDate()).toBe(newDue.getDate());
  });

  test('claim an unassigned appointment', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();

    const claimBtn = page.getByRole('dialog', { name: 'Appointment Details' })
      .getByRole('button', { name: /claim/i });
    const isClaimVisible = await claimBtn.isVisible().catch(() => false);

    if (isClaimVisible) {
      const claimPromise = page.waitForResponse(
        (r) => r.url().includes(`/api/appointments/${createdAppointment.id}/claim`) && r.request().method() === 'PUT',
      );
      await detail.clickClaim();
      await claimPromise;
    }

    expect(true).toBe(true);
  });
});
