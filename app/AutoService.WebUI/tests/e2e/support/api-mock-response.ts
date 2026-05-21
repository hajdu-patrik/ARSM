import type { Route } from '@playwright/test';

export async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders(route),
    body: JSON.stringify(body),
  });
}

export async function fulfillNoContent(route: Route): Promise<void> {
  await route.fulfill({ status: 204, headers: corsHeaders(route) });
}

export function corsHeaders(route: Route): Record<string, string> {
  const origin = route.request().headers().origin ?? 'https://localhost:5173';

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  };
}
