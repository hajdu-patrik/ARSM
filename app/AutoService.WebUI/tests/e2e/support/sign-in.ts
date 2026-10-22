import type { Page } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { installApiMocks, type InstallApiMockOptions } from './api-mocks';
import { type TestLanguage } from './browser-state';
import { getAppointmentFlowEnv } from './e2e-env';
import type { MockApiState } from './test-data';

/** Installs the API mocks and signs in as the mechanic; returns the mutable mock state. */
export async function signInWithMocks(
  page: Page,
  options: Partial<InstallApiMockOptions> = {},
  language: TestLanguage = 'en',
): Promise<MockApiState> {
  const env = getAppointmentFlowEnv();
  const state = await installApiMocks(page, { profileEmail: env.mechanicEmail, ...options });
  await new AuthPage(page).loginAsMechanic(env, language);
  return state;
}
