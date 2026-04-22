import { expect, type Page } from '@playwright/test';

/**
 * Page object for scheduler-level interactions used by the appointment flow test.
 */
export class SchedulerPage {
  constructor(private readonly page: Page) {}

  /** Verifies the scheduler shell is visible after successful authentication. */
  async expectLoaded(): Promise<void> {
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeVisible();
  }

  /**
   * Selects today's day in the calendar using the deterministic test id emitted by CalendarView.
   */
  async selectTodayCalendarDay(): Promise<void> {
    const today = new Date();
    const dayTestId = this.buildDayTestId(today);
    const todayCell = this.page.getByTestId(dayTestId);
    await expect(todayCell).toBeVisible();

    const isSelected = (await todayCell.getAttribute('class'))?.includes('ring-2') ?? false;
    if (!isSelected) {
      await todayCell.click();
    }

    await expect(todayCell).toHaveClass(/ring-2/);
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeEnabled();
  }

  /**
   * Clicks a specific day cell by date.
   *
   * @param date - The date to click.
   */
  async selectDay(date: Date): Promise<void> {
    const testId = this.buildDayTestId(date);
    const cell = this.page.getByTestId(testId);
    await expect(cell).toBeVisible();
    await cell.click();
    await expect(cell).toHaveClass(/ring-2/);
  }

  /** Returns the test-id of the currently selected (ring-highlighted) day, or null. */
  async getSelectedDayTestId(): Promise<string | null> {
    const selected = this.page.locator('[data-testid^="calendar-day-"][class*="ring-2"]');
    if ((await selected.count()) === 0) return null;
    return selected.first().getAttribute('data-testid');
  }

  /** Clicks the month navigation forward button. */
  async navigateNextMonth(): Promise<void> {
    const buttons = this.page.locator('button').filter({ has: this.page.locator('svg') });
    const navButtons = this.page.locator('[class*="calendar"] button, [class*="Calendar"] button').filter({ has: this.page.locator('svg') });
    if (await navButtons.count() >= 2) {
      await navButtons.last().click();
    } else {
      await buttons.filter({ hasText: '' }).last().click();
    }
  }

  /** Clicks the month navigation back button. */
  async navigatePrevMonth(): Promise<void> {
    const navButtons = this.page.locator('[class*="calendar"] button, [class*="Calendar"] button').filter({ has: this.page.locator('svg') });
    if (await navButtons.count() >= 2) {
      await navButtons.first().click();
    }
  }

  /** Returns the visible month header text (e.g., "April 2026"). */
  async getMonthHeaderText(): Promise<string> {
    const header = this.page.locator('h2, [class*="font-semibold"]').filter({ hasText: /\d{4}/ }).first();
    return (await header.textContent()) ?? '';
  }

  /** Opens the scheduler intake modal for the selected day. */
  async openIntakeModal(): Promise<void> {
    await this.page.getByTestId('scheduler-intake-open').click();
    await expect(this.page.getByRole('dialog', { name: 'New Intake' })).toBeVisible();
  }

  /**
   * Performs existing-customer lookup by email.
   *
   * @param email - Existing customer email.
   */
  async lookupCustomerByEmail(email: string): Promise<void> {
    await this.page.getByTestId('scheduler-intake-customer-email').fill(email);
    await this.page.getByTestId('scheduler-intake-search').click();
  }

  /**
   * Selects the first available existing vehicle option from the lookup result.
   *
   * @returns The selected vehicle id value.
   */
  async selectFirstExistingVehicle(): Promise<string> {
    const vehicleSelect = this.page.getByTestId('scheduler-intake-existing-vehicle');
    const vehicleOptions = vehicleSelect.locator('option:not([value=""])');

    await expect(vehicleSelect).toBeVisible();
    await this.page.waitForFunction(() => {
      const select = globalThis.document.querySelector('[data-testid="scheduler-intake-existing-vehicle"]');
      if (!(select instanceof HTMLSelectElement)) {
        return false;
      }

      return select.querySelectorAll('option:not([value=""])').length > 0;
    });

    const selectedValue = await vehicleOptions.first().getAttribute('value');

    if (!selectedValue) {
      throw new Error('Could not read an existing vehicle option value from lookup result.');
    }

    await vehicleSelect.selectOption(selectedValue);
    return selectedValue;
  }

  /**
   * Sets the intake task description.
   *
   * @param taskDescription - Unique task text used for deterministic lookup.
   */
  async fillTaskDescription(taskDescription: string): Promise<void> {
    await this.page.getByTestId('scheduler-intake-task-description').fill(taskDescription);
  }

  /** Submits the scheduler intake form. */
  async createIntake(): Promise<void> {
    await this.page.getByTestId('scheduler-intake-create').click();
  }

  /**
   * Opens the detail modal by clicking the appointment card containing the task text.
   *
   * @param taskDescription - Unique task description used during intake creation.
   */
  async openAppointmentByTask(taskDescription: string): Promise<void> {
    const taskText = this.page.getByText(taskDescription, { exact: true });
    await expect(taskText).toBeVisible({ timeout: 15_000 });
    await taskText.click();
  }

  /** Asserts the intake button is disabled. */
  async expectIntakeButtonDisabled(): Promise<void> {
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeDisabled();
  }

  /** Asserts the intake button is enabled. */
  async expectIntakeButtonEnabled(): Promise<void> {
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeEnabled();
  }

  private buildDayTestId(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `calendar-day-${yyyy}-${mm}-${dd}`;
  }
}
