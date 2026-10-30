import { expect, type Locator, type Page } from '@playwright/test';
import { installApiMocks } from '../support/api-mocks';
import { primeBrowserState, type TestLanguage } from '../support/browser-state';
import { selectDropdownOptionByLabel } from '../support/dropdown';
import { paginationControls, type PaginationControls } from '../support/pagination';
import type { MockApiState } from '../support/test-data';

/** The required fields of the mechanic registration form; the password confirmation defaults to the password. */
export interface MechanicRegistrationValues {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email: string;
  readonly password?: string;
  readonly confirmPassword?: string;
}

interface OpenAdminOptions {
  readonly language?: TestLanguage;
  /** Runs after the API mocks are installed and before the page loads, to seed the state or arm a route override. */
  readonly prepare?: (state: MockApiState, page: Page) => Promise<void> | void;
}

export const REGISTER_PASSWORD = 'StrongPass1!';

/** Page object for the admin mechanic management page: the roster and the registration form. */
export class AdminPage {
  constructor(private readonly page: Page) {}

  /** Opens `/admin/register` as an admin with the API mocks; returns the page object and the mutable mock state. */
  static async open(page: Page, options: OpenAdminOptions = {}): Promise<{ adminPage: AdminPage; state: MockApiState }> {
    await primeBrowserState(page, { sessionHint: true, language: options.language ?? 'en' });
    const state = await installApiMocks(page, {
      profileEmail: 'admin.edge@example.test',
      isAuthenticated: true,
      isAdmin: true,
    });
    await options.prepare?.(state, page);
    await page.goto('/admin/register');
    await expect(page.locator('#reg-email')).toBeVisible();

    return { adminPage: new AdminPage(page), state };
  }

  firstName(): Locator {
    return this.page.locator('#firstName');
  }

  middleName(): Locator {
    return this.page.locator('#middleName');
  }

  lastName(): Locator {
    return this.page.locator('#lastName');
  }

  email(): Locator {
    return this.page.locator('#reg-email');
  }

  phone(): Locator {
    return this.page.locator('#reg-phone');
  }

  password(): Locator {
    return this.page.locator('#reg-password');
  }

  confirmPassword(): Locator {
    return this.page.locator('#reg-confirm-password');
  }

  specialization(): Locator {
    return this.page.locator('#specialization');
  }

  submit(): Locator {
    return this.page.getByRole('button', { name: /Register Mechanic|Szerelő regisztrálása/i });
  }

  confirmDialog(): Locator {
    return this.page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i });
  }

  /** The first expertise tile (Engine, or Motor in Hungarian). */
  engineExpertise(): Locator {
    return this.page.getByRole('checkbox', { name: /^(Engine|Motor)$/ });
  }

  /** The clickable tile of the first expertise (the checkbox itself is visually hidden). */
  engineTile(): Locator {
    return this.page.locator('label').filter({ hasText: /Engine|Motor/i }).first();
  }

  roster(): Locator {
    return this.page.locator('section[aria-label="Registered mechanics"], section[aria-label="Regisztrált szerelők"]');
  }

  rosterRow(personId: number): Locator {
    return this.page.getByTestId(`mechanic-row-${String(personId)}`);
  }

  rosterRows(): Locator {
    return this.page.getByTestId(/^mechanic-row-/);
  }

  searchInput(): Locator {
    return this.page.getByTestId('mechanic-search-input');
  }

  pagination(): PaginationControls {
    return paginationControls(this.page, 'mechanics-pagination');
  }

  /** Fills every required field with a petrol and diesel engine mechanic; the defaults are valid values. */
  async fillRequired(values: MechanicRegistrationValues): Promise<void> {
    const { password = REGISTER_PASSWORD } = values;
    await this.firstName().fill(values.firstName ?? 'Edge');
    await this.lastName().fill(values.lastName ?? 'Mechanic');
    await this.email().fill(values.email);
    await this.password().fill(password);
    await this.confirmPassword().fill(values.confirmPassword ?? password);
    await selectDropdownOptionByLabel(this.page, this.specialization(), /Petrol & diesel|Benzin és dízel/);
    await this.engineTile().click();
  }

  /** Fills the form, submits it and confirms the dialog; the request goes out when this resolves. */
  async register(values: MechanicRegistrationValues): Promise<void> {
    await this.fillRequired(values);
    await this.submit().click();
    await this.confirmDialog().getByRole('button', { name: /Register|Regisztrálás/i }).click();
  }
}
