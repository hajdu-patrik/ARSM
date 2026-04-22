import { expect, type Page } from '@playwright/test';

/**
 * Page object for the sidebar layout navigation.
 */
export class SidebarPage {
  constructor(private readonly page: Page) {}

  /** Clicks a navigation item by its visible text. */
  async clickNavItem(name: string): Promise<void> {
    await this.page.getByRole('link', { name, exact: false }).click();
  }

  /** Clicks the logout button in the sidebar. */
  async clickLogout(): Promise<void> {
    await this.page.getByRole('button', { name: /logout/i }).click();
  }

  /** Asserts a nav item is visible in the sidebar. */
  async expectNavItemVisible(name: string): Promise<void> {
    await expect(this.page.getByRole('link', { name, exact: false })).toBeVisible();
  }

  /** Asserts a nav item is NOT visible in the sidebar. */
  async expectNavItemHidden(name: string): Promise<void> {
    await expect(this.page.getByRole('link', { name, exact: false })).toBeHidden();
  }

  /** Clicks the sidebar collapse/expand toggle button. */
  async toggleCollapse(): Promise<void> {
    const collapseBtn = this.page.locator('aside button').first();
    await collapseBtn.click();
  }
}
