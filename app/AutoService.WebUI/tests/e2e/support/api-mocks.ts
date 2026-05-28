import type { Page } from '@playwright/test';
import { createMockApiState, type MockApiState } from './test-data';
import { handleApiRoute } from './api-mock-handlers';

/** Mock installation options for authenticated E2E API scenarios and failure paths. */
export interface InstallApiMockOptions {
  readonly profileEmail: string;
  readonly isAdmin?: boolean;
  readonly isAuthenticated?: boolean;
  readonly routeCallLog?: string[];
  readonly unauthorizedOnceRouteKeys?: readonly string[];
  readonly refreshShouldFail?: boolean;
  readonly failedCustomerHistoryIds?: readonly number[];
  readonly failedVehicleHistoryIds?: readonly number[];
}

/** Installs deterministic API route mocks and returns the mutable mock state. */
export async function installApiMocks(page: Page, options: InstallApiMockOptions): Promise<MockApiState> {
  const state = createMockApiState(options.profileEmail);

  await page.route('**/api/**', async (route) => {
    await handleApiRoute(route, state, options);
  });

  return state;
}
