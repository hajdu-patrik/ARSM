import { expect, test } from '@playwright/test';
import { SidebarPage } from './pages/sidebar.page';
import { SchedulerPage } from './pages/scheduler.page';
import { getAppointmentFlowEnv } from './support/e2e-env';
import { initBrowserState, loginAsMechanic } from './support/auth.helper';

test.describe('Customers registry', () => {
  test.beforeEach(async ({ page }) => {
    const env = getAppointmentFlowEnv();
    await initBrowserState(page);
    await loginAsMechanic(page, env.mechanicEmail, env.mechanicPassword);
  });

  test('sidebar navigation and customers search/sort interactions work', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.expectNavItemVisible('Customers');
    await sidebar.clickNavItem('Customers');

    await expect(page).toHaveURL(/\/customers/);
    await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible();

    const searchInput = page.getByTestId('customers-search-input');
    const sortToggle = page.getByTestId('customers-sort-toggle');
    const customerCards = page.locator('[data-testid^="customer-card-"]');

    await expect(customerCards.first()).toBeVisible({ timeout: 15_000 });
    await expect(sortToggle).toContainText('A-Z');

    await sortToggle.click();
    await expect(sortToggle).toContainText('Z-A');

    await searchInput.fill('zzzzzzzzzzzzzz');
    await expect(page.getByText('No customers match your current filter.')).toBeVisible();

    await searchInput.fill('a');
    await expect(page.getByText('No customers match your current filter.')).toBeHidden();

    await page.getByTestId('customers-search-clear').click();
    await expect(searchInput).toHaveValue('');
    await expect(customerCards.first()).toBeVisible();
  });

  test('customer and vehicle modals show example placeholders', async ({ page }) => {
    const scheduler = new SchedulerPage(page);
    await scheduler.expectLoaded();

    const sidebar = new SidebarPage(page);
    await sidebar.clickNavItem('Customers');
    await expect(page).toHaveURL(/\/customers/);

    await page.getByTestId('customers-create-button').click();

    await expect(page.locator('#customer-first-name')).toHaveAttribute('placeholder', /e\.g\./i);
    await expect(page.locator('#customer-middle-name')).toHaveAttribute('placeholder', /optional/i);
    await expect(page.locator('#customer-last-name')).toHaveAttribute('placeholder', /e\.g\./i);
    await expect(page.locator('#customer-email')).toHaveAttribute('placeholder', /@/);
    await expect(page.locator('#customer-phone')).toHaveAttribute('placeholder', /\+36/);

    await page.getByRole('button', { name: /Cancel|Mégse/i }).first().click();

    const firstExpandButton = page.locator('[data-testid^="customer-expand-"]').first();
    await expect(firstExpandButton).toBeVisible({ timeout: 15_000 });
    await firstExpandButton.click();

    await page.getByRole('button', { name: 'Create vehicle' }).first().click();

    await expect(page.locator('#vehicle-license-plate')).toHaveAttribute('placeholder', /ABC-123/i);
    await expect(page.locator('#vehicle-brand')).toHaveAttribute('placeholder', /Volkswagen/i);
    await expect(page.locator('#vehicle-model')).toHaveAttribute('placeholder', /Golf/i);
    await expect(page.locator('#vehicle-year')).toHaveAttribute('placeholder', /2018/);
    await expect(page.locator('#vehicle-mileage')).toHaveAttribute('placeholder', /124500/);
    await expect(page.locator('#vehicle-power')).toHaveAttribute('placeholder', /110/);
    await expect(page.locator('#vehicle-torque')).toHaveAttribute('placeholder', /250/);
  });
});
