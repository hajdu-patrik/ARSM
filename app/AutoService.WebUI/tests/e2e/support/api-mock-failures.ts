import type { Route } from '@playwright/test';
import type { MockApiState } from './test-data';
import { fulfillJson } from './api-mock-response';

/** Answers the request with the failure armed for its route key; a one-shot failure is used up. */
export async function tryFailRoute(route: Route, state: MockApiState, routeKey: string): Promise<boolean> {
  const failure = state.routeFailures.get(routeKey);
  if (failure === undefined) {
    return false;
  }

  if (failure.repeat !== true) {
    state.routeFailures.delete(routeKey);
  }

  if (failure.abort === true) {
    await route.abort('failed');
    return true;
  }

  await fulfillJson(route, failure.body ?? {}, failure.status ?? 500, failure.headers);
  return true;
}
