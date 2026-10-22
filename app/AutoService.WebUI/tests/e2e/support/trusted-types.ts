import type { Page } from '@playwright/test';

/** The Trusted Types directives of the production CSP (vite.config.ts); the dev server sends no CSP. */
const TRUSTED_TYPES_POLICY = "require-trusted-types-for 'script'; trusted-types 'none'";

/** Headers that describe the body encoding of the fetched response, not the body handed back. */
const BODY_ENCODING_HEADERS: ReadonlySet<string> = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

const VIOLATIONS_KEY = '__arsmPolicyViolations';

/** Adds the Trusted Types policy as a Content-Security-Policy header to every document response.
 * Register it before `installApiMocks`, so the API mock answers its requests without passing through here. */
export async function enforceTrustedTypes(page: Page): Promise<void> {
  await page.route('**', async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.fallback();
      return;
    }

    const response = await route.fetch();
    const headers: Record<string, string> = {};

    for (const [name, value] of Object.entries(response.headers())) {
      if (!BODY_ENCODING_HEADERS.has(name)) {
        headers[name] = value;
      }
    }

    const existingPolicy = headers['content-security-policy'];
    headers['content-security-policy'] = existingPolicy === undefined
      ? TRUSTED_TYPES_POLICY
      : `${existingPolicy}, ${TRUSTED_TYPES_POLICY}`;

    await route.fulfill({ status: response.status(), headers, body: await response.body() });
  });
}

/** Records every `securitypolicyviolation` event of each loaded document from its start;
 * read them with `readPolicyViolations`. */
export async function recordPolicyViolations(page: Page): Promise<void> {
  await page.addInitScript((violationsKey: string) => {
    const violations: string[] = [];

    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI} ${event.sample}`.trim());
    });
    Object.defineProperty(globalThis, violationsKey, { value: violations });
  }, VIOLATIONS_KEY);
}

/** Reads the violations recorded on the current document, one text line per event. */
export function readPolicyViolations(page: Page): Promise<string[]> {
  return page.evaluate((violationsKey: string): string[] => {
    const value: unknown = Reflect.get(globalThis, violationsKey);

    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }, VIOLATIONS_KEY);
}

const TRUSTED_TYPES_MESSAGE = /TrustedHTML|TrustedScript|TrustedScriptURL|TrustedType|trusted-types|require-trusted-types-for/i;

/** Collects console errors, console warnings and uncaught page errors that name Trusted Types. */
export function watchTrustedTypesErrors(page: Page): string[] {
  const messages: string[] = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()) && TRUSTED_TYPES_MESSAGE.test(message.text())) {
      messages.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (TRUSTED_TYPES_MESSAGE.test(error.message)) {
      messages.push(error.message);
    }
  });

  return messages;
}
