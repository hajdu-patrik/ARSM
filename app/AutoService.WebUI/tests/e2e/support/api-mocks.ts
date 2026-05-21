import type { Page } from '@playwright/test';
import { createMockApiState, type MockApiState } from './test-data';
import { handleApiRoute } from './api-mock-handlers';

export interface InstallApiMockOptions {
  readonly profileEmail: string;
  readonly isAdmin?: boolean;
  readonly isAuthenticated?: boolean;
}

export async function installApiMocks(page: Page, options: InstallApiMockOptions): Promise<MockApiState> {
  const state = createMockApiState(options.profileEmail);

  await page.route('**/api/**', async (route) => {
    await handleApiRoute(route, state, options);
  });

  return state;
}
