import { expect, type Locator, type Page } from '@playwright/test';
import { selectDropdownOptionByLabel } from '../support/dropdown';
import { paginationControls, type PaginationControls } from '../support/pagination';

const DETAIL_NAME = /Appointment details|Időpont részletei/i;
const MONTH_LIST_NAME = /Monthly appointments|Havi időpontok/;
const PREVIOUS_MONTH_NAME = /Previous month|Előző hónap/;
const NEXT_MONTH_NAME = /Next month|Következő hónap/;

type SchedulerLanguage = 'en' | 'hu';

function intlLocale(language: SchedulerLanguage): string {
  return language === 'en' ? 'en-GB' : 'hu-HU';
}

/** A vehicle typed into the intake's new-vehicle form. */
export interface NewVehicleValues {
  readonly licensePlate: string;
  readonly vin: string;
  readonly brand: string;
  readonly model: string;
  readonly year: string;
  readonly mileageKm: string;
  readonly enginePowerKw: string;
  readonly drivetrain: string;
}

/** Page object for the scheduler calendar, month list, intake and appointment detail dialogs. */
export class SchedulerPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByTestId('scheduler-intake-open')).toBeVisible();
  }

  intakeDialog(): Locator {
    return this.page.getByRole('dialog', { name: /New intake|Új felvétel/ });
  }

  detailDialog(): Locator {
    return this.page.getByRole('dialog', { name: DETAIL_NAME });
  }

  monthList(): Locator {
    return this.page.getByRole('region', { name: MONTH_LIST_NAME });
  }

  /** The overlay buttons that open a card's details, one per listed appointment, in list order. */
  appointmentCards(): Locator {
    return this.monthList().getByRole('button', { name: DETAIL_NAME });
  }

  /** The task paragraphs of the listed cards (matching the pattern), in list order. */
  cardTasks(pattern: RegExp): Locator {
    return this.monthList().getByText(pattern);
  }

  /** The card whose task text contains the given text: the innermost block that holds the card's overlay button. */
  cardFor(task: string): Locator {
    return this.monthList()
      .locator('div')
      .filter({ has: this.page.getByRole('button', { name: DETAIL_NAME }), hasText: task })
      .last();
  }

  previousMonthButton(): Locator {
    return this.page.getByRole('button', { name: PREVIOUS_MONTH_NAME });
  }

  nextMonthButton(): Locator {
    return this.page.getByRole('button', { name: NEXT_MONTH_NAME });
  }

  /** The date as the app writes it in full, formatted by the browser the app runs in. */
  async longDate(date: Date, language: SchedulerLanguage = 'en'): Promise<string> {
    return this.page.evaluate(
      ({ locale, year, month, day }) => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(year, month, day)),
      { locale: intlLocale(language), year: date.getFullYear(), month: date.getMonth(), day: date.getDate() },
    );
  }

  /** The calendar heading of the month `offset` months from the current one. */
  async monthHeading(offset: number, language: SchedulerLanguage = 'en'): Promise<Locator> {
    const now = new Date();
    const label = await this.page.evaluate(
      ({ locale, year, month }) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month, 1)),
      { locale: intlLocale(language), year: now.getFullYear(), month: now.getMonth() + offset },
    );

    return this.page.getByRole('heading', { name: label, level: 3 });
  }

  deleteButton(): Locator {
    return this.detailDialog().getByTestId('appointment-detail-delete');
  }

  async openFirstAppointmentDetail(): Promise<Locator> {
    await this.page.getByRole('button', { name: DETAIL_NAME }).first().click();

    const dialog = this.detailDialog();
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Selects today first when the intake button is disabled, then opens the intake dialog. */
  async openIntakeForCurrentDay(): Promise<Locator> {
    const openButton = this.page.getByTestId('scheduler-intake-open');

    if (await openButton.isDisabled()) {
      await this.page.getByTestId(currentDayTestId()).click();
      await expect(openButton).toBeEnabled();
    }

    await openButton.click();

    const dialog = this.intakeDialog();
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async searchByLicensePlate(licensePlate: string): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByTestId('scheduler-intake-license-plate-lookup').fill(licensePlate);
  }

  async searchByName(name: string): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByTestId('scheduler-intake-name-lookup').fill(name);
  }

  async searchMissingEmail(email: string): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByTestId('scheduler-intake-name-lookup').fill(email);
  }

  /** Changes the status in the open appointment detail dialog by the option's visible label. */
  async changeAppointmentStatus(statusLabel: string | RegExp): Promise<void> {
    const trigger = this.detailDialog().getByRole('combobox', { name: 'Change appointment status' });
    await selectDropdownOptionByLabel(this.page, trigger, statusLabel);
  }

  /** Types the values into the new-vehicle form of the open intake (the form's plate field is the last one labelled so). */
  async fillNewVehicle(values: NewVehicleValues): Promise<void> {
    const dialog = this.intakeDialog();
    await dialog.getByLabel('License plate', { exact: true }).last().fill(values.licensePlate);
    await dialog.getByLabel('VIN', { exact: true }).fill(values.vin);
    await dialog.getByLabel('Brand', { exact: true }).fill(values.brand);
    await dialog.getByLabel('Model', { exact: true }).fill(values.model);
    await dialog.getByLabel('Year', { exact: true }).fill(values.year);
    await dialog.getByLabel('Mileage (km)', { exact: true }).fill(values.mileageKm);
    await dialog.getByLabel('Engine power (kW)', { exact: true }).fill(values.enginePowerKw);
    await selectDropdownOptionByLabel(this.page, dialog.getByRole('combobox'), values.drivetrain);
  }

  suggestionsPagination(): PaginationControls {
    return paginationControls(this.intakeDialog(), 'intake-suggestions-pagination');
  }

  async createWithCurrentForm(): Promise<void> {
    await this.intakeDialog().getByTestId('scheduler-intake-create').click();
  }

  /** Creates an intake for the current day: finds the customer by plate, picks the first match and fills the task. */
  async createIntake(licensePlate: string, taskDescription: string): Promise<void> {
    const dialog = await this.openIntakeForCurrentDay();
    await this.searchByLicensePlate(licensePlate);
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await dialog.getByTestId('scheduler-intake-task-description').fill(taskDescription);
    await this.createWithCurrentForm();
    await expect(this.intakeDialog()).toHaveCount(0);
  }
}

/** Test id of the calendar day button that shows the date. */
export function calendarDayTestId(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `calendar-day-${year}-${month}-${day}`;
}

export function currentDayTestId(): string {
  return calendarDayTestId(new Date());
}