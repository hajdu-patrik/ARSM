import type { InstallApiMockOptions } from './api-mocks';

export function isAuthenticated(options: InstallApiMockOptions): boolean {
  return options.isAuthenticated !== false;
}
