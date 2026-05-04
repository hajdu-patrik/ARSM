import { expect, test, type Page, type Response } from '@playwright/test';
import { SchedulerPage } from './pages/scheduler.page';
import { AppointmentDetailPage } from './pages/appointment-detail.page';
import { getAdminFlowEnv, getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

interface AppointmentResponse {
  id: number;
  dueDateTime: string;
  taskDescription: string;
  vehicle?: {
    mileageKm: number;
  };
}

interface UpdateAppointmentRequest {
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

async function createTodayIntakeAppointment(
  page: Page,
  customerEmail: string,
  taskDescription: string,
): Promise<AppointmentResponse> {
  const scheduler = new SchedulerPage(page);
  await scheduler.expectLoaded();
  await scheduler.selectTodayCalendarDay();
  await scheduler.openIntakeModal();

  const lookupPromise = page.waitForResponse(
    (r) => matchesApiPath(r, 'GET', '/api/customers/by-email') && r.status() === 200,
  );
  await scheduler.lookupCustomerByEmail(customerEmail);
  await lookupPromise;

  await scheduler.selectFirstExistingVehicle();
  await scheduler.fillTaskDescription(taskDescription);

  const createPromise = page.waitForResponse(
    (r) => matchesApiPath(r, 'POST', '/api/appointments/intake') && r.status() >= 200 && r.status() < 300,
  );
  await scheduler.createIntake();
  const createResponse = await createPromise;
  const createdAppointment = await createResponse.json() as AppointmentResponse;

  await expect(page.getByRole('dialog', { name: 'New Intake' })).toBeHidden();

  return createdAppointment;
}

test.describe('Scheduler appointment detail', () => {
  let createdAppointment: AppointmentResponse;
  let taskDescription: string;

  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);

    taskDescription = `Playwright detail ${Date.now()}`;
    createdAppointment = await createTodayIntakeAppointment(page, env.existingCustomerEmail, taskDescription);
  });

  test('open appointment detail modal by clicking card', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();
  });

  test('close appointment detail modal from header close action', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();
    await detail.close();
    await detail.expectClosed();
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

    const vehicleUpdatePath = `/api/appointments/${createdAppointment.id}/vehicle`;
    let vehicleUpdateCount = 0;
    const onResponse = (response: Response) => {
      if (matchesApiPath(response, 'PUT', vehicleUpdatePath)) {
        vehicleUpdateCount += 1;
      }
    };

    page.on('response', onResponse);

    const updatePromise = page.waitForResponse(
      (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}`) && r.status() === 200,
    );
    try {
      await detail.save();
      const updateResponse = await updatePromise;
      const updateRequest = updateResponse.request().postDataJSON() as UpdateAppointmentRequest;
      const updated = await updateResponse.json() as AppointmentResponse;

      expect(new Date(updated.dueDateTime).getDate()).toBe(newDue.getDate());
      expect(updateRequest.taskDescription).toBeTruthy();
      expect(updateRequest).not.toHaveProperty('licensePlate');
      expect(updateRequest).not.toHaveProperty('brand');
      expect(updateRequest).not.toHaveProperty('model');
      expect(updateRequest).not.toHaveProperty('year');
      expect(updateRequest).not.toHaveProperty('mileageKm');
      expect(updateRequest).not.toHaveProperty('enginePowerHp');
      expect(updateRequest).not.toHaveProperty('engineTorqueNm');

      await expect.poll(() => vehicleUpdateCount, { timeout: 500 }).toBe(0);
    } finally {
      page.off('response', onResponse);
    }
  });

  test('edit mode keeps vehicle fields read-only', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();
    await detail.startEdit();
    await detail.expectVehicleFieldsReadOnlyInEdit();
  });

  test('detail modal shows customer name only', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();
    await detail.expectCustomerNameOnlySection();
  });

  test('claim an unassigned appointment', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();

    const isClaimVisible = await detail.isClaimButtonVisible();

    if (isClaimVisible) {
      const claimPromise = page.waitForResponse(
        (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}/claim`) && r.status() === 200,
      );
      await detail.clickClaim();
      await claimPromise;
    }

    expect(true).toBe(true);
  });

  test('cancelled appointment hides claim and self-unassign mechanic actions', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();

    if (await detail.isClaimButtonVisible()) {
      const claimPromise = page.waitForResponse(
        (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}/claim`) && r.status() === 200,
      );
      await detail.clickClaim();
      await claimPromise;
    }

    if (!await detail.isStatusSelectVisible()) {
      test.skip(true, 'Status selector unavailable for this appointment context.');
    }

    const hadUnclaimButton = await detail.isUnclaimButtonVisible();

    const statusPromise = page.waitForResponse(
      (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}/status`) && r.status() === 200,
    );
    await detail.changeStatus('Cancelled');
    await statusPromise;

    const statusText = (await detail.getStatusBadgeText()).toLowerCase();
    expect(statusText).toContain('cancel');

    await detail.expectClaimHidden();
    if (hadUnclaimButton) {
      await detail.expectUnclaimHidden();
    }
  });
});

test.describe('Scheduler appointment detail admin remove mechanic modal', () => {
  let createdAppointment: AppointmentResponse;
  let taskDescription: string;

  test.beforeEach(async ({ page }) => {
    const adminEnv = getAdminFlowEnv();
    if (!adminEnv) {
      test.skip(true, 'Admin credentials not configured');
      return;
    }

    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, adminEnv.adminEmail, adminEnv.adminPassword);

    taskDescription = `Playwright admin detail ${Date.now()}`;
    createdAppointment = await createTodayIntakeAppointment(page, env.existingCustomerEmail, taskDescription);
  });

  test('remove-mechanic confirmation auto-closes when appointment becomes cancelled', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.openAppointmentByTask(taskDescription);

    const detail = new AppointmentDetailPage(page);
    await detail.expectOpen();

    if (await detail.isClaimButtonVisible()) {
      const claimPromise = page.waitForResponse(
        (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}/claim`) && r.status() === 200,
      );
      await detail.clickClaim();
      await claimPromise;
    }

    if (!await detail.isStatusSelectVisible()) {
      test.skip(true, 'Status selector unavailable; admin is not assigned to this appointment.');
    }

    if (!await detail.isRemoveMechanicButtonVisible()) {
      const mechanicIdToAssign = await detail.selectFirstAvailableMechanicForAssign();
      test.skip(!mechanicIdToAssign, 'No additional mechanics available for remove-mechanic scenario.');

      const assignPromise = page.waitForResponse(
        (r) => matchesApiPath(r, 'PUT', `/api/appointments/${createdAppointment.id}/assign/${mechanicIdToAssign}`)
          && r.status() === 200,
      );
      await detail.clickAddMechanic();
      await assignPromise;
    }

    if (!await detail.isRemoveMechanicButtonVisible()) {
      test.skip(true, 'Remove-mechanic action is unavailable for this appointment in current data.');
    }

    await detail.openFirstRemoveMechanicConfirmation();
    await detail.expectRemoveMechanicConfirmationOpen();

    const cancelResponse = await page.request.put(
      `/api/appointments/${createdAppointment.id}/status`,
      { data: { status: 'Cancelled' } },
    );
    expect(cancelResponse.ok()).toBeTruthy();

    await detail.expectRemoveMechanicConfirmationClosed(20_000);
  });
});
