import { expect, type Page } from '@playwright/test';

/**
 * Page object for the month appointment list section of the scheduler.
 */
export class MonthAppointmentListPage {
  constructor(private readonly page: Page) {}

  /** Asserts the month list section is visible. */
  async expectVisible(): Promise<void> {
    await expect(this.page.locator('[class*="grid"]').filter({ hasText: /./  }).first()).toBeVisible();
  }

  /** Returns the number of visible appointment cards. */
  async getCardCount(): Promise<number> {
    const cards = this.page.locator('[class*="rounded"][class*="border"][class*="shadow"]')
      .filter({ has: this.page.locator('[class*="text-sm"], [class*="text-xs"]') });
    return cards.count();
  }

  /** Clicks the "Show all" / clear-filter chip if visible. */
  async clickClearFilter(): Promise<void> {
    const chip = this.page.getByText(/show all|clear/i);
    if (await chip.isVisible()) {
      await chip.click();
    }
  }

  /** Clicks a status filter chip by status text. */
  async clickStatusFilter(status: string): Promise<void> {
    await this.page.getByRole('button', { name: status, exact: false }).click();
  }

  /** Clicks the sort toggle button. */
  async toggleSort(): Promise<void> {
    const sortBtn = this.page.locator('button').filter({ has: this.page.locator('svg') })
      .filter({ hasText: '' });
    const sortButtons = this.page.locator('[aria-label*="sort" i], [title*="sort" i]');
    if (await sortButtons.count() > 0) {
      await sortButtons.first().click();
    } else {
      await sortBtn.last().click();
    }
  }
}
