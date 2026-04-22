import { expect, test, type Response } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { SchedulerPage } from './pages/scheduler.page';
import { AppointmentDetailPage } from './pages/appointment-detail.page';
import { getAppointmentFlowEnv } from './support/e2e-env';

interface AppointmentResponse {
  id: number;
  dueDateTime: string;
  taskDescription: string;
}

interface UpdateAppointmentRequest {
  dueDateTime: string;
}

/**
 * Formats a Date object to a local datetime string accepted by `datetime-local` inputs.
 *
 * @param date - Date value to format.
 * @returns Datetime-local representation (`YYYY-MM-DDTHH:mm`).
 */
function toDatetimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Checks whether a Playwright response matches a concrete HTTP method + API path.
 *
 * @param response - Candidate response.
 * @param method - Expected request method.
 * @param pathSuffix - Expected URL pathname suffix.
 */
function matchesApiPath(response: Response, method: string, pathSuffix: string): boolean {
  return response.request().method() === method
    && new URL(response.url()).pathname.endsWith(pathSuffix);
}

test.describe('Scheduler appointment flow', () => {
  test('login fail -> login success -> create intake -> shift due date by +2 days', async ({ page }) => {
    const env = getAppointmentFlowEnv();

    await page.addInitScript(() => {
      localStorage.setItem('loading-page-seen', '1');
      localStorage.setItem('preferred-language', 'en');
      localStorage.removeItem('autoservice-session-hint');
      sessionStorage.removeItem('scheduler-selected-view');
    });

    const loginPage = new LoginPage(page);
    const schedulerPage = new SchedulerPage(page);
    const appointmentDetailPage = new AppointmentDetailPage(page);

    await loginPage.goto();

    const failedLoginResponsePromise = page.waitForResponse(
      (response) => matchesApiPath(response, 'POST', '/api/auth/login') && response.status() === 401,
    );
    await loginPage.submitWithEmail(env.mechanicEmail, env.wrongPassword);
    await failedLoginResponsePromise;
    await loginPage.expectStillOnLogin();

    const successfulLoginResponsePromise = page.waitForResponse(
      (response) => matchesApiPath(response, 'POST', '/api/auth/login') && response.status() === 200,
    );
    await loginPage.submitWithEmail(env.mechanicEmail, env.mechanicPassword);
    await successfulLoginResponsePromise;

    await expect(page).toHaveURL(/\/$/);
    await schedulerPage.expectLoaded();

    await schedulerPage.selectTodayCalendarDay();
    await schedulerPage.openIntakeModal();

    const lookupResponsePromise = page.waitForResponse(
      (response) => matchesApiPath(response, 'GET', '/api/customers/by-email') && response.status() === 200,
    );
    await schedulerPage.lookupCustomerByEmail(env.existingCustomerEmail);
    await lookupResponsePromise;

    await schedulerPage.selectFirstExistingVehicle();

    const taskDescription = `Playwright e2e appointment ${Date.now()}`;
    await schedulerPage.fillTaskDescription(taskDescription);

    const createIntakeResponsePromise = page.waitForResponse(
      (response) => matchesApiPath(response, 'POST', '/api/appointments/intake')
        && response.status() >= 200
        && response.status() < 300,
    );
    await schedulerPage.createIntake();
    const createIntakeResponse = await createIntakeResponsePromise;
    const createdAppointment = await createIntakeResponse.json() as AppointmentResponse;

    expect(createdAppointment.id).toBeGreaterThan(0);
    expect(createdAppointment.taskDescription).toBe(taskDescription);

    await expect(page.getByRole('dialog', { name: 'New Intake' })).toBeHidden();

    await schedulerPage.openAppointmentByTask(taskDescription);
    await appointmentDetailPage.expectOpen();

    await appointmentDetailPage.startEdit();

    const currentDueDate = new Date(createdAppointment.dueDateTime);
    currentDueDate.setDate(currentDueDate.getDate() + 2);

    const updatedDueDateTimeLocal = toDatetimeLocalValue(currentDueDate);
    const expectedUpdatedDueIso = new Date(updatedDueDateTimeLocal).toISOString();

    await appointmentDetailPage.setDueDateTime(updatedDueDateTimeLocal);

    const updateResponsePromise = page.waitForResponse(
      (response) => matchesApiPath(response, 'PUT', `/api/appointments/${createdAppointment.id}`) && response.status() === 200,
    );
    await appointmentDetailPage.save();

    const updateResponse = await updateResponsePromise;
    const updateRequestPayload = updateResponse.request().postDataJSON() as UpdateAppointmentRequest;
    const updatedAppointment = await updateResponse.json() as AppointmentResponse;

    const expectedDueEpoch = new Date(expectedUpdatedDueIso).getTime();
    expect(new Date(updateRequestPayload.dueDateTime).getTime()).toBe(expectedDueEpoch);
    expect(new Date(updatedAppointment.dueDateTime).getTime()).toBe(expectedDueEpoch);
  });
});
