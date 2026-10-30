import type { Page } from '@playwright/test';
import { createMockApiState, type MockApiState } from './test-data';
import { handleApiRoute } from './api-mock-handlers';
import type { MockFailure } from './api-mock-response';

/** Who is signed in and which one-shot failures and call logging the mocked API starts with. */
export interface InstallApiMockOptions {
  readonly profileEmail: string;
  readonly isAdmin?: boolean;
  readonly isAuthenticated?: boolean;
  /** The account still has a temporary password: login and validate say so until the password is changed. */
  readonly mustChangePassword?: boolean;
  readonly routeCallLog?: string[];
  readonly unauthorizedOnceRouteKeys?: readonly string[];
  readonly refreshShouldFail?: boolean;
  /** Failures armed from the start per route key; a spec arms more later through `state.routeFailures`. */
  readonly routeFailures?: Readonly<Record<string, MockFailure>>;
  readonly failedCustomerHistoryIds?: readonly number[];
  readonly failedVehicleHistoryIds?: readonly number[];
}

/** Installs deterministic API route mocks and returns the mutable mock state. */
export async function installApiMocks(page: Page, options: InstallApiMockOptions): Promise<MockApiState> {
  const state = createMockApiState(options.profileEmail);
  state.mustChangePassword = options.mustChangePassword ?? false;
  for (const [routeKey, failure] of Object.entries(options.routeFailures ?? {})) {
    state.routeFailures.set(routeKey, failure);
  }

  await page.route('**/api/**', async (route) => {
    await handleApiRoute(route, state, options);
  });

  return state;
}
