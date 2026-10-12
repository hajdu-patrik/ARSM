import { expect, test, type Page } from '@playwright/test';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { paginationControls } from './support/pagination';
import type { MockApiState } from './support/test-data';
import { toastMessage } from './support/toast';

function registrationSelectors(page: Page) {
  return {
    firstName: page.locator('#firstName'),
    lastName: page.locator('#lastName'),
    email: page.locator('#reg-email'),
    password: page.locator('#reg-password'),
    confirmPassword: page.locator('#reg-confirm-password'),
    specialization: page.locator('#specialization'),
    submit: page.getByRole('button', { name: /Register Mechanic|Szerelő regisztrálása/i }),
  };
}

function selectedMechanicsSection(page: Page) {
  return page.locator('section[aria-label="Registered mechanics"], section[aria-label="Regisztrált szerelők"]');
}

/** Required registration form values with overridable defaults for edge cases. */
interface RequiredRegistrationFields {
  readonly email: string;
  readonly lastName?: string;
  readonly confirmPassword?: string;
}

/** Fills the required mechanic registration fields with deterministic defaults. */
async function fillRequiredRegistrationFields(page: Page, fields: RequiredRegistrationFields): Promise<void> {
  const {
    email,
    lastName = 'Mechanic',
    confirmPassword = 'StrongPass1!',
  } = fields;
  const selectors = registrationSelectors(page);

  await selectors.firstName.fill('Edge');
  await selectors.lastName.fill(lastName);
  await selectors.email.fill(email);
  await selectors.password.fill('StrongPass1!');
  await selectors.confirmPassword.fill(confirmPassword);
  await selectDropdownOptionByLabel(page, selectors.specialization, 'Petrol & diesel');
  await page.locator('label').filter({ hasText: /Engine|Motor/i }).first().click();
}

test.describe('Admin mechanic registration edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, {
      profileEmail: 'admin.edge@example.test',
      isAuthenticated: true,
      isAdmin: true,
    });
    await page.goto('/admin/register');
    await expect(page.locator('#reg-email')).toBeVisible();
  });

  test('shows frontend mismatch validation before confirmation step', async ({ page }) => {
    await fillRequiredRegistrationFields(page, {
      email: 'mismatch.mechanic@example.test',
      lastName: 'Mismatch',
      confirmPassword: 'DifferentPass1!',
    });

    const selectors = registrationSelectors(page);

    await expect(page.locator('#reg-confirm-password')).toHaveAttribute('aria-invalid', 'true');
    await expect(selectors.submit).toBeDisabled();
    await expect(page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i })).toHaveCount(0);
  });

  test('registers mechanic through confirmation modal and updates list', async ({ page }) => {
    const newEmail = 'new.mechanic@example.test';
    const selectors = registrationSelectors(page);

    await fillRequiredRegistrationFields(page, { email: newEmail });
    await selectors.submit.click();

    const confirmDialog = page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /Register|Regisztrálás/i }).click();

    await expect(page.locator('output[aria-live="polite"]')).toContainText(/registered successfully|sikeresen regisztrálva/i);
    const mechanicsSection = selectedMechanicsSection(page);
    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toBeVisible();
  });

  test('deletes a newly registered mechanic through confirmation modal', async ({ page }) => {
    const newEmail = 'delete.mechanic@example.test';
    const selectors = registrationSelectors(page);
    const mechanicsSection = selectedMechanicsSection(page);

    await fillRequiredRegistrationFields(page, { email: newEmail });
    await selectors.submit.click();
    await page.getByRole('dialog', { name: /Confirm Registration|Regisztráció megerősítése/i })
      .getByRole('button', { name: /Register|Regisztrálás/i })
      .click();

    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toBeVisible();
    // The list is always ascending by name, so the new mechanic is not necessarily the last row: target the
    // innermost element that holds both its e-mail and a delete button (its own row).
    const deleteButtonName = /Delete mechanic|Szerelő törlése/i;
    const newMechanicRow = mechanicsSection
      .locator('div')
      .filter({ has: page.getByText(newEmail, { exact: true }) })
      .filter({ has: page.getByRole('button', { name: deleteButtonName }) })
      .last();
    await newMechanicRow.getByRole('button', { name: deleteButtonName }).click();

    const deleteDialog = page.getByRole('dialog', { name: /Confirm mechanic deletion|Szerelő törlésének megerősítése/i });
    await expect(deleteDialog).toContainText(newEmail);
    await deleteDialog.getByRole('button', { name: /Delete|Törlés/i }).click();

    // The registration toast from the step above can still be on screen, so match the deletion
    // message rather than the email, which both toasts contain.
    await expect(toastMessage(page, /deleted successfully|sikeresen törölve/i)).toContainText(newEmail);
    await expect(mechanicsSection.getByText(newEmail, { exact: true })).toHaveCount(0);
  });
});

const MECHANIC_PAGE_SIZE = 5;
const SEEDED_MECHANIC_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Adds mechanics "Mech ZedA" ... "Mech ZedH" after the four fixture mechanics: twelve in all, pages of 5, 5 and 2. */
function seedMechanics(state: MockApiState): void {
  SEEDED_MECHANIC_LETTERS.forEach((letter, index) => {
    state.mechanics.push({
      personId: 9100 + index,
      firstName: 'Mech',
      middleName: null,
      lastName: `Zed${letter}`,
      email: `zed.${letter.toLowerCase()}@example.test`,
      phoneNumber: null,
      specialization: 'All',
      hasProfilePicture: false,
      isAdmin: false,
    });
  });
}

test.describe('Admin mechanic roster paging', () => {
  let rosterRequests: URL[] = [];

  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    const state = await installApiMocks(page, {
      profileEmail: 'admin.edge@example.test',
      isAuthenticated: true,
      isAdmin: true,
    });
    seedMechanics(state);
    rosterRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (request.method() === 'GET' && url.pathname === '/api/admin/mechanics') {
        rosterRequests.push(url);
      }
    });
    await page.goto('/admin/register');
    await expect(paginationControls(page, 'mechanics-pagination').indicator).toBeVisible();
  });

  test('shows five mechanics per page, ascending, with arrows and an indicator', async ({ page }) => {
    const { previous, next, indicator } = paginationControls(page, 'mechanics-pagination');
    const rosterEmail = (letter: string) => page.getByText(`zed.${letter}@example.test`, { exact: true });

    await expect(indicator).toHaveText('1 / 3');
    await expect(previous).toBeDisabled();
    await expect(page.getByText('gabor.kovacs@example.com', { exact: true })).toBeVisible();
    await expect(rosterEmail('a')).toBeVisible();
    await expect(rosterEmail('b')).toHaveCount(0);
    expect(rosterRequests.some((url) => url.searchParams.get('pageSize') === String(MECHANIC_PAGE_SIZE))).toBe(true);

    await next.click();
    await expect(indicator).toHaveText('2 / 3');
    await expect(rosterEmail('b')).toBeVisible();
    await expect(rosterEmail('f')).toBeVisible();
    await expect(rosterEmail('a')).toHaveCount(0);
    expect(rosterRequests.at(-1)?.searchParams.get('page')).toBe('2');

    await next.click();
    await expect(indicator).toHaveText('3 / 3');
    await expect(rosterEmail('g')).toBeVisible();
    await expect(rosterEmail('h')).toBeVisible();
    await expect(next).toBeDisabled();

    await previous.click();
    await expect(indicator).toHaveText('2 / 3');
  });

  test('searches on the server from page 1, and offers no sort toggle or sort parameter', async ({ page }) => {
    const { next, indicator } = paginationControls(page, 'mechanics-pagination');

    await expect(page.getByTestId('mechanic-sort-toggle')).toHaveCount(0);

    await next.click();
    await expect(indicator).toHaveText('2 / 3');
    await page.getByTestId('mechanic-search-input').fill('Zed');
    await expect(indicator).toHaveText('1 / 2');
    await page.getByTestId('mechanic-search-input').fill('zedc');

    await expect(indicator).toHaveText('1 / 1');
    await expect(page.getByText('zed.c@example.test', { exact: true })).toBeVisible();
    await expect(page.getByText('zed.d@example.test', { exact: true })).toHaveCount(0);
    expect(rosterRequests.some((url) => url.searchParams.get('search') === 'zedc')).toBe(true);
    expect(rosterRequests.some((url) => url.searchParams.has('sortDirection'))).toBe(false);
  });
});
