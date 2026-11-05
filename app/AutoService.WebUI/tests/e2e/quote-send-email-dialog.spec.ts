/** Sending a draft to a customer without a usable address: the 422 opens the e-mail dialog, which saves the
 * typed address to the customer and sends again; a taken address stays on the field, Cancel keeps the draft. */
import { expect, test, type Page } from '@playwright/test';
import { QuotesPage } from './pages/quotes.page';
import { signInWithMocks } from './support/sign-in';
import { MOCK_CUSTOMER_IDS, MOCK_QUOTE_IDS, MOCK_VEHICLE_IDS, type MockApiState } from './support/test-data';
import { errorToastMessage, toastMessage } from './support/toast';
import type { TestLanguage } from './support/browser-state';

const DRAFT_NUMBER = 'ARSM-2026-0001';
const STATUS_PATH = `/api/quotes/${String(MOCK_QUOTE_IDS.draftTimingBelt)}/status`;
const VEHICLE_PATH = `/api/vehicles/${String(MOCK_VEHICLE_IDS.annaNxe441)}`;
const CUSTOMER_PATH = `/api/customers/${String(MOCK_CUSTOMER_IDS.anna)}`;
const DRAFT_VERSION = 101;
const NEW_ADDRESS = 'anna.new@example.test';
const SEND_REQUEST = { status: 'Sent', version: DRAFT_VERSION };

/** The addresses the API refuses to mail: empty, and the synthetic one of a customer a mechanic created. */
const UNUSABLE_ADDRESSES = [
  { label: 'an empty address', email: '', submit: 'click' },
  { label: 'a mechanic-owner .local address', email: 'mechanic-owner-12@customers.arsm.local', submit: 'Enter' },
] as const;

interface RecordedCall {
  readonly call: string;
  readonly body: unknown;
}

/** Records, in order, the requests of the send flow: the status POSTs and the vehicle and customer reads and write. */
function recordSendFlow(page: Page): RecordedCall[] {
  const calls: RecordedCall[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (['GET', 'PUT', 'POST'].includes(request.method()) && [STATUS_PATH, VEHICLE_PATH, CUSTOMER_PATH].includes(pathname)) {
      calls.push({ call: `${request.method()} ${pathname}`, body: request.postDataJSON() as unknown });
    }
  });

  return calls;
}

/** Gives Anna, the owner of the draft's vehicle, the address the test needs. */
function setAnnaAddress(state: MockApiState, email: string): void {
  const anna = state.customers.find((customer) => customer.id === MOCK_CUSTOMER_IDS.anna);
  if (anna === undefined) {
    throw new Error('The fixture customer is missing.');
  }

  anna.email = email;
}

/** Signs in, gives the draft's customer the address, opens the draft and presses Send. */
async function pressSend(page: Page, email: string, language: TestLanguage = 'en'): Promise<{ quotesPage: QuotesPage; state: MockApiState }> {
  const state = await signInWithMocks(page, {}, language);
  setAnnaAddress(state, email);
  const quotesPage = new QuotesPage(page);
  await quotesPage.goto();
  await quotesPage.openQuote(DRAFT_NUMBER);
  await page.getByTestId('quote-send-button').click();
  await expect(quotesPage.customerEmailDialog()).toBeVisible();

  return { quotesPage, state };
}

test.describe('Quotes - customer e-mail dialog', () => {
  test.use({ timezoneId: 'UTC', viewport: { width: 1280, height: 1200 } });

  for (const unusable of UNUSABLE_ADDRESSES) {
    test(`${unusable.label} opens the dialog; confirming saves the address and sends the quote`, async ({ page }) => {
      const calls = recordSendFlow(page);
      const { quotesPage, state } = await pressSend(page, unusable.email);

      await quotesPage.customerEmailInput().fill(NEW_ADDRESS);
      if (unusable.submit === 'Enter') {
        await quotesPage.customerEmailInput().press('Enter');
      } else {
        await quotesPage.customerEmailConfirmButton().click();
      }

      await expect(toastMessage(page, /e-mailed to the customer/)).toBeVisible();
      await expect(quotesPage.customerEmailDialog()).toHaveCount(0);
      await expect(quotesPage.editorDialog().getByTestId('quote-status-badge').first()).toHaveText('Sent');
      expect(calls).toEqual([
        { call: `POST ${STATUS_PATH}`, body: SEND_REQUEST },
        { call: `GET ${VEHICLE_PATH}`, body: null },
        { call: `GET ${CUSTOMER_PATH}`, body: null },
        {
          call: `PUT ${CUSTOMER_PATH}`,
          body: { firstName: 'Anna', middleName: null, lastName: 'Kovacs', email: NEW_ADDRESS, phoneNumber: '+36 30 111 2222' },
        },
        { call: `POST ${STATUS_PATH}`, body: SEND_REQUEST },
      ]);
      expect(state.customers.find((customer) => customer.id === MOCK_CUSTOMER_IDS.anna)?.email).toBe(NEW_ADDRESS);
    });
  }

  test('an address another person holds is refused on the field, the dialog stays and a fixed address sends', async ({ page }) => {
    const calls = recordSendFlow(page);
    const { quotesPage } = await pressSend(page, '');
    const input = quotesPage.customerEmailInput();

    await input.fill('bela.toth@example.test');
    await quotesPage.customerEmailConfirmButton().click();

    await expect(quotesPage.customerEmailDialog().getByText('A person with this email already exists.')).toBeVisible();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(quotesPage.customerEmailDialog()).toBeVisible();
    expect(calls.filter((entry) => entry.call === `POST ${STATUS_PATH}`)).toHaveLength(1);

    await input.fill(NEW_ADDRESS);
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    await quotesPage.customerEmailConfirmButton().click();

    await expect(toastMessage(page, /e-mailed to the customer/)).toBeVisible();
    await expect(quotesPage.editorDialog().getByTestId('quote-status-badge').first()).toHaveText('Sent');
  });

  test('Cancel closes the dialog, keeps the draft and saves nothing', async ({ page }) => {
    const calls = recordSendFlow(page);
    const { quotesPage, state } = await pressSend(page, '');

    await quotesPage.customerEmailCancelButton().click();

    await expect(quotesPage.customerEmailDialog()).toHaveCount(0);
    await expect(quotesPage.editorDialog().getByTestId('quote-status-badge').first()).toHaveText('Draft');
    await expect(page.getByTestId('quote-send-button')).toBeEnabled();
    expect(calls).toEqual([{ call: `POST ${STATUS_PATH}`, body: SEND_REQUEST }]);
    expect(state.customers.find((customer) => customer.id === MOCK_CUSTOMER_IDS.anna)?.email).toBe('');
  });

  test('a typed address that is unusable too toasts the missing-address message and keeps the draft', async ({ page }) => {
    const { quotesPage } = await pressSend(page, '');

    await quotesPage.customerEmailInput().fill('anna@customers.arsm.local');
    await quotesPage.customerEmailConfirmButton().click();

    await expect(errorToastMessage(page, 'The quote cannot be sent: the customer has no e-mail address.')).toBeVisible();
    await expect(quotesPage.customerEmailDialog()).toHaveCount(0);
    await expect(quotesPage.editorDialog().getByTestId('quote-status-badge').first()).toHaveText('Draft');
  });

  test('speaks Hungarian: the dialog title, the taken-address text and the sent toast', async ({ page }) => {
    const { quotesPage } = await pressSend(page, '', 'hu');
    const input = quotesPage.customerEmailInput();

    await input.fill('bela.toth@example.test');
    await quotesPage.customerEmailConfirmButton().click();
    await expect(quotesPage.customerEmailDialog().getByText('Már létezik személy ezzel az e-mail-címmel.')).toBeVisible();

    await input.fill(NEW_ADDRESS);
    await quotesPage.customerEmailConfirmButton().click();
    await expect(toastMessage(page, 'Az árajánlatot e-mailben elküldtük az ügyfél címére.')).toBeVisible();
    await expect(quotesPage.customerEmailDialog()).toHaveCount(0);
  });
});
