/** Customer create and edit modals: required fields and input filters, the request payloads, server refusals
 * pinned to their field, a stale edit and the keyboard close. */
import { expect, test } from '@playwright/test';
import { CustomersPage } from './pages/customers.page';
import { MOCK_CUSTOMER_IDS } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';

// Tall enough that a new customer, who sorts first, is on page 1.
test.use({ viewport: { width: 1280, height: 1100 } });

const NEW_CUSTOMER = { firstName: 'Zoe', lastName: 'Aaron', email: 'zoe.aaron@example.test' } as const;
const ANNA_EMAIL = 'anna.kovacs@example.test';
const EMAIL_TAKEN = 'A person with this email already exists.';
const PHONE_TAKEN = 'A person with this phone number already exists.';

const TAKEN_EMAILS = [
  { owner: 'another customer', email: ANNA_EMAIL },
  { owner: 'a mechanic', email: 'gabor.kovacs@example.com' },
  { owner: 'another customer in other letter case', email: 'ANNA.Kovacs@Example.Test' },
] as const;

test.describe('Create customer', () => {
  test('keeps Save disabled until both names and the e-mail are filled', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openCreateCustomer();
    const save = dialog.getByRole('button', { name: 'Save' });

    await expect(save).toBeDisabled();
    await dialog.getByLabel('First name').fill('Zoe');
    await dialog.getByLabel('Last name').fill('Aaron');
    await expect(save).toBeDisabled();
    await dialog.getByLabel('Email').fill(NEW_CUSTOMER.email);
    await expect(save).toBeEnabled();
    await dialog.getByLabel('First name').fill('');
    await expect(save).toBeDisabled();
  });

  test('lets names keep letters and hyphens only and the phone keep digits and phone symbols', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openCreateCustomer();

    await dialog.getByLabel('First name').fill('Jo3hn-Ma ry!');
    await dialog.getByLabel('Middle name').fill('Van 2');
    await dialog.getByLabel('Phone number').fill('+36a30b1234567');

    await expect(dialog.getByLabel('First name')).toHaveValue('John-Mary');
    await expect(dialog.getByLabel('Middle name')).toHaveValue('Van');
    await expect(dialog.getByLabel('Phone number')).toHaveValue('+36301234567');
  });

  test('sends blank optional fields as null and lists the new customer', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openCreateCustomer();
    await customersPage.fillCustomer(dialog, NEW_CUSTOMER);

    const request = page.waitForRequest((candidate) => candidate.method() === 'POST' && new URL(candidate.url()).pathname === '/api/customers');
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await request).postDataJSON()).toEqual({ ...NEW_CUSTOMER, middleName: null, phoneNumber: null });
    await expect(toastMessage(page, 'Customer created successfully.')).toBeVisible();
    await expect(customersPage.customerDialog('Create customer')).toHaveCount(0);
    const card = page.getByTestId(/^customer-card-/).filter({ hasText: 'Aaron Zoe' });
    await expect(card).toBeVisible();
    await expect(card).toContainText(NEW_CUSTOMER.email);
    await expect(card).toContainText('Vehicles: 0');
  });

  test('sends the middle name and the phone number when they are filled', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openCreateCustomer();
    await customersPage.fillCustomer(dialog, { ...NEW_CUSTOMER, middleName: 'Van-Der', phoneNumber: '+36301234567' });

    const request = page.waitForRequest((candidate) => candidate.method() === 'POST' && new URL(candidate.url()).pathname === '/api/customers');
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await request).postDataJSON()).toEqual({ ...NEW_CUSTOMER, middleName: 'Van-Der', phoneNumber: '+36301234567' });
    await expect(page.getByTestId(/^customer-card-/).filter({ hasText: 'Aaron Zoe Van-Der' })).toContainText('+36301234567');
  });
});

test.describe('Create customer refused by the server', () => {
  for (const { owner, email } of TAKEN_EMAILS) {
    test(`refuses an e-mail taken by ${owner} under the field, and the error clears on edit`, async ({ page }) => {
      const { customersPage } = await CustomersPage.open(page);
      const dialog = await customersPage.openCreateCustomer();
      await customersPage.fillCustomer(dialog, { ...NEW_CUSTOMER, email });
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(errorToastMessage(page, EMAIL_TAKEN)).toBeVisible();
      await expect(dialog.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
      await expect(dialog.getByText(EMAIL_TAKEN)).toBeVisible();

      await dialog.getByLabel('Email').fill(NEW_CUSTOMER.email);
      await expect(dialog.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true');
      await expect(dialog.getByText(EMAIL_TAKEN)).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Save' }).click();
      await expect(toastMessage(page, 'Customer created successfully.')).toBeVisible();
    });
  }

  test('refuses a taken phone number under the phone field', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openCreateCustomer();
    await customersPage.fillCustomer(dialog, { ...NEW_CUSTOMER, phoneNumber: '+36 30 111 2222' });
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, PHONE_TAKEN)).toBeVisible();
    await expect(dialog.getByLabel('Phone number')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByText(PHONE_TAKEN)).toBeVisible();
  });

  test('toasts an invalid e-mail or phone number and keeps the dialog and its values', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openCreateCustomer();
    await customersPage.fillCustomer(dialog, { ...NEW_CUSTOMER, email: 'not-an-email' });
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Email must be a valid email address.')).toBeVisible();
    await expect(dialog.getByLabel('Email')).toHaveValue('not-an-email');

    await dialog.getByLabel('Email').fill(NEW_CUSTOMER.email);
    await dialog.getByLabel('Phone number').fill('+1');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Phone number must be a valid European number.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});

test.describe('Edit customer', () => {
  test('is prefilled and keeps Save disabled until a value really changes', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openEditCustomer(MOCK_CUSTOMER_IDS.anna);
    const save = dialog.getByRole('button', { name: 'Save' });

    await expect(dialog.getByLabel('First name')).toHaveValue('Anna');
    await expect(dialog.getByLabel('Middle name')).toHaveValue('');
    await expect(dialog.getByLabel('Last name')).toHaveValue('Kovacs');
    await expect(dialog.getByLabel('Email')).toHaveValue(ANNA_EMAIL);
    await expect(dialog.getByLabel('Phone number')).toHaveValue('+36 30 111 2222');
    await expect(save).toBeDisabled();

    await dialog.getByLabel('Last name').fill('Kovacs-Nagy');
    await expect(save).toBeEnabled();
    await dialog.getByLabel('Last name').fill('Kovacs');
    await expect(save).toBeDisabled();
  });

  test('saves the change and shows it on the card', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openEditCustomer(MOCK_CUSTOMER_IDS.anna);
    await dialog.getByLabel('Last name').fill('Kovacs-Nagy');

    const request = page.waitForRequest((candidate) => candidate.method() === 'PUT' && new URL(candidate.url()).pathname === `/api/customers/${String(MOCK_CUSTOMER_IDS.anna)}`);
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await request).postDataJSON()).toEqual({
      firstName: 'Anna',
      middleName: null,
      lastName: 'Kovacs-Nagy',
      email: ANNA_EMAIL,
      phoneNumber: '+36 30 111 2222',
    });
    await expect(toastMessage(page, 'Customer updated successfully.')).toBeVisible();
    await expect(customersPage.customerDialog('Edit customer')).toHaveCount(0);
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).toContainText('Kovacs-Nagy Anna');
  });

  test('sends null when the phone number is cleared', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openEditCustomer(MOCK_CUSTOMER_IDS.anna);
    await dialog.getByLabel('Phone number').fill('');

    const request = page.waitForRequest((candidate) => candidate.method() === 'PUT');
    await dialog.getByRole('button', { name: 'Save' }).click();

    expect((await request).postDataJSON()).toMatchObject({ phoneNumber: null });
    await expect(toastMessage(page, 'Customer updated successfully.')).toBeVisible();
    await expect(customersPage.customerCard(MOCK_CUSTOMER_IDS.anna)).not.toContainText('+36 30 111 2222');
  });

  test('refuses the e-mail of another customer under the field', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const dialog = await customersPage.openEditCustomer(MOCK_CUSTOMER_IDS.anna);
    await dialog.getByLabel('Email').fill('bela.toth@example.test');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(dialog.getByText(EMAIL_TAKEN)).toBeVisible();
    await expect(dialog.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(errorToastMessage(page, EMAIL_TAKEN)).toBeVisible();
  });

  test('toasts that the customer is gone when someone deleted it meanwhile', async ({ page }) => {
    const { customersPage, state } = await CustomersPage.open(page);
    const dialog = await customersPage.openEditCustomer(MOCK_CUSTOMER_IDS.anna);
    state.customers.splice(state.customers.findIndex((customer) => customer.id === MOCK_CUSTOMER_IDS.anna), 1);

    await dialog.getByLabel('Last name').fill('Kovacs-Nagy');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'Customer not found.')).toBeVisible();
    await expect(dialog).toBeVisible();
  });
});

test.describe('Customer modal keyboard and cancel', () => {
  test('Cancel and Escape close it without a write and Escape returns focus to the opener', async ({ page }) => {
    const { customersPage } = await CustomersPage.open(page);
    const writes: string[] = [];
    page.on('request', (request) => {
      if (!['GET', 'OPTIONS'].includes(request.method())) {
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });

    const dialog = await customersPage.openCreateCustomer();
    await dialog.getByLabel('First name').fill('Zoe');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);

    const reopened = await customersPage.openCreateCustomer();
    await expect(reopened.getByLabel('First name')).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(reopened).toHaveCount(0);
    await expect(customersPage.createCustomerButton()).toBeFocused();
    expect(writes).toEqual([]);
  });
});
