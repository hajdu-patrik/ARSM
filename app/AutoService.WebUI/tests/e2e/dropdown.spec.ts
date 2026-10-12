/** The shared Dropdown that replaced the native selects: combobox/listbox ARIA, keyboard control,
 * dismissal by outside click and Escape, and the same behaviour inside a modal. */
import { expect, test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { CustomersPage } from './pages/customers.page';
import { QuotesPage } from './pages/quotes.page';
import { installApiMocks } from './support/api-mocks';
import { primeBrowserState } from './support/browser-state';
import { selectDropdownOptionByLabel } from './support/dropdown';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { MOCK_CUSTOMER_IDS } from './support/test-data';

const STATUS_FILTER = 'quotes-status-filter';
const STATUS_VALUES = ['All', 'Draft', 'Sent', 'Expired', 'Accepted', 'Rejected'];

test.describe('Dropdown on the Quotes status filter', () => {
  test.beforeEach(async ({ page }) => {
    await primeBrowserState(page, { sessionHint: true });
    await installApiMocks(page, { profileEmail: 'mechanic.dropdown@example.test', isAuthenticated: true });
    await new QuotesPage(page).goto();
  });

  test('is a combobox for a listbox of options and tracks the selected one', async ({ page }) => {
    const trigger = page.getByTestId(STATUS_FILTER);
    const listbox = page.getByTestId(`${STATUS_FILTER}-listbox`);

    await expect(trigger).toHaveRole('combobox');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(listbox).toBeHidden();

    await trigger.click();

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(listbox).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-controls', (await listbox.getAttribute('id')) ?? '');
    await expect(listbox.getByRole('option')).toHaveCount(STATUS_VALUES.length);
    await expect(page.getByTestId(`${STATUS_FILTER}-option-All`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId(`${STATUS_FILTER}-option-Draft`)).toHaveAttribute('aria-selected', 'false');
  });

  test('is driven from the keyboard: arrows, Home, End, type-ahead, Enter, Space and Escape', async ({ page }) => {
    const quotesPage = new QuotesPage(page);
    const trigger = page.getByTestId(STATUS_FILTER);
    const listbox = page.getByTestId(`${STATUS_FILTER}-listbox`);
    const optionId = async (value: string) => (await page.getByTestId(`${STATUS_FILTER}-option-${value}`).getAttribute('id')) ?? '';

    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(listbox).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-activedescendant', await optionId('All'));

    await page.keyboard.press('ArrowDown');
    await expect(trigger).toHaveAttribute('aria-activedescendant', await optionId('Draft'));
    await page.keyboard.press('End');
    await expect(trigger).toHaveAttribute('aria-activedescendant', await optionId('Rejected'));
    await page.keyboard.press('Home');
    await expect(trigger).toHaveAttribute('aria-activedescendant', await optionId('All'));
    await page.keyboard.press('S');
    await expect(trigger).toHaveAttribute('aria-activedescendant', await optionId('Sent'));

    await page.keyboard.press('Enter');

    await expect(listbox).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Sent');
    await expect(quotesPage.row('ARSM-2026-0002')).toBeVisible();
    await expect(quotesPage.row('ARSM-2026-0001')).toHaveCount(0);

    await page.keyboard.press('Space');
    await expect(listbox).toBeVisible();
    await expect(page.getByTestId(`${STATUS_FILTER}-option-Sent`)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Sent');
  });

  test('closes on an outside click without changing the selection', async ({ page }) => {
    const trigger = page.getByTestId(STATUS_FILTER);
    const listbox = page.getByTestId(`${STATUS_FILTER}-listbox`);

    await trigger.click();
    await expect(listbox).toBeVisible();

    await page.getByRole('heading', { level: 1 }).click();

    await expect(listbox).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId(`${STATUS_FILTER}-option-All`)).toHaveCount(0);
  });
});

test.describe('Dropdown inside a modal', () => {
  test('opens above the dialog, and Escape closes only the list before the dialog', async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await installApiMocks(page, { profileEmail: env.mechanicEmail });
    await new AuthPage(page).loginAsMechanic(env);
    await page.setViewportSize({ width: 1280, height: 1000 });
    const customersPage = new CustomersPage(page);
    await customersPage.goto();
    await customersPage.expandCustomer(MOCK_CUSTOMER_IDS.anna);
    const dialog = await customersPage.openCreateVehicle(MOCK_CUSTOMER_IDS.anna);

    const trigger = dialog.getByRole('combobox', { name: 'Drivetrain' });
    const listbox = page.getByRole('listbox');

    await expect(trigger).toHaveText('Select drivetrain...');
    await trigger.click();
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option')).toHaveCount(5);
    // The list is not clipped by the dialog: its last option is reachable by a real pointer.
    await listbox.getByRole('option', { name: 'Electric' }).hover();

    await page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByRole('heading', { name: 'Create vehicle' }).click();
    await expect(listbox).toBeHidden();
    await expect(dialog).toBeVisible();

    await selectDropdownOptionByLabel(page, trigger, 'Plug-in hybrid');
    await expect(trigger).toHaveText('Plug-in hybrid');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(customersPage.vehicleDialog('Create vehicle')).toHaveCount(0);
  });
});
