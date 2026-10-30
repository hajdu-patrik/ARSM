/** Catalog form rules shared by parts and labour types: what enables Save, the uppercase identifier and the
 * length caps, the live gross preview per VAT rate, the edit baseline, and every refusal pinned to its field. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { CatalogPage, type CatalogItemKind, type CatalogTab } from './pages/catalog.page';
import { expectDropdownLabel, selectDropdownOption } from './support/dropdown';
import { fulfillJson } from './support/api-mock-response';
import { signInWithMocks } from './support/sign-in';
import { errorToastMessage } from './support/toast';

/** Per-kind labels, ids and fixture values of the second list row (the one the edit tests open). */
interface KindCase {
  readonly kind: CatalogItemKind;
  readonly tab: CatalogTab;
  readonly apiPath: string;
  readonly identifierLabel: string;
  readonly rateLabel: string;
  readonly previewLabel: string;
  readonly vatTestId: string;
  readonly secondIdentifier: string;
  readonly secondRate: string;
  readonly secondGrossAt18: RegExp;
  readonly takenIdentifier: string;
  readonly duplicateMessage: string;
  readonly saveFailedMessage: string;
}

const KIND_CASES: readonly KindCase[] = [
  {
    kind: 'part',
    tab: 'parts',
    apiPath: '/api/parts',
    identifierLabel: 'Part number',
    rateLabel: 'Net unit price',
    previewLabel: 'Gross unit price (preview)',
    vatTestId: 'part-vat-rate',
    secondIdentifier: 'BRK-2002',
    secondRate: '8000',
    secondGrossAt18: /9,440\.00/,
    takenIdentifier: 'ALT-1001',
    duplicateMessage: 'A part with this part number already exists.',
    saveFailedMessage: 'Failed to save part changes.',
  },
  {
    kind: 'laborType',
    tab: 'labor-types',
    apiPath: '/api/labor-types',
    identifierLabel: 'Code',
    rateLabel: 'Hourly rate (net)',
    previewLabel: 'Gross hourly rate (preview)',
    vatTestId: 'labor-type-vat-rate',
    secondIdentifier: 'LBR-OIL',
    secondRate: '6000',
    secondGrossAt18: /7,080\.00/,
    takenIdentifier: 'LBR-DIAG',
    duplicateMessage: 'A labour type with this code already exists.',
    saveFailedMessage: 'Failed to save labour type changes.',
  },
];

/** Answers the create POST of one catalog path with the given status and body; every other request goes on. */
async function refuseCreate(page: Page, apiPath: string, status: number, body: unknown): Promise<void> {
  await page.route((url) => url.pathname === apiPath, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    await fulfillJson(route, body, status);
  });
}

/** Fills the open create dialog with a valid identifier, name and rate. */
async function fillCreateForm(dialog: Locator, catalogCase: KindCase): Promise<void> {
  await dialog.getByLabel(catalogCase.identifierLabel).fill('NEW-1');
  await dialog.getByLabel('Name').fill('New item');
  await dialog.getByLabel(catalogCase.rateLabel).fill('5000');
}

for (const catalogCase of KIND_CASES) {
  test.describe(`Catalog form rules - ${catalogCase.tab}`, () => {
    test.use({ viewport: { width: 1280, height: 1000 } });

    test('Save waits for an identifier, a name and a rate, and the identifier is upper-cased and capped', async ({ page }) => {
      await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      await catalog.goto(catalogCase.tab);
      const dialog = await catalog.openCreate(catalogCase.kind);
      const save = dialog.getByRole('button', { name: 'Save' });
      const identifier = dialog.getByLabel(catalogCase.identifierLabel);

      await expect(save).toBeDisabled();
      await identifier.fill('clt-3003');
      await expect(identifier).toHaveValue('CLT-3003');
      await expect(identifier).toHaveAttribute('maxlength', '40');
      await expect(dialog.getByLabel('Name')).toHaveAttribute('maxlength', '120');
      await dialog.getByLabel('Name').fill('   ');
      await dialog.getByLabel(catalogCase.rateLabel).fill('5000');
      await expect(save).toBeDisabled();

      await dialog.getByLabel('Name').fill('Clutch kit');
      await expect(save).toBeEnabled();
      await dialog.getByLabel(catalogCase.rateLabel).fill('');
      await expect(save).toBeDisabled();
    });

    test('the gross preview follows the chosen VAT rate', async ({ page }) => {
      await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      await catalog.goto(catalogCase.tab);
      const dialog = await catalog.openCreate(catalogCase.kind);
      const preview = dialog.getByLabel(catalogCase.previewLabel);

      await dialog.getByLabel(catalogCase.rateLabel).fill('5000');
      await expect(preview).toHaveValue(/6,350\.00/);
      await selectDropdownOption(page, catalogCase.vatTestId, '5');
      await expectDropdownLabel(dialog.getByTestId(catalogCase.vatTestId), '5%');
      await expect(preview).toHaveValue(/5,250\.00/);
      await selectDropdownOption(page, catalogCase.vatTestId, '18');
      await expect(preview).toHaveValue(/5,900\.00/);
    });

    test('an edit starts from the stored values and saves only a real change', async ({ page }) => {
      await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      await catalog.goto(catalogCase.tab);
      const dialog = await catalog.openEdit(catalogCase.kind, 1);
      const save = dialog.getByRole('button', { name: 'Save' });
      const rate = dialog.getByLabel(catalogCase.rateLabel);

      await expect(dialog.getByLabel(catalogCase.identifierLabel)).toHaveValue(catalogCase.secondIdentifier);
      await expect(rate).toHaveValue(catalogCase.secondRate);
      await expectDropdownLabel(dialog.getByTestId(catalogCase.vatTestId), '27%');
      await expect(save).toBeDisabled();

      await rate.fill('9500');
      await expect(save).toBeEnabled();
      await rate.fill(catalogCase.secondRate);
      await expect(save).toBeDisabled();

      await selectDropdownOption(page, catalogCase.vatTestId, '18');
      await expect(dialog.getByLabel(catalogCase.previewLabel)).toHaveValue(catalogCase.secondGrossAt18);
      await expect(save).toBeEnabled();
    });

    test('taking another item\'s identifier on edit is refused on the field until it is changed', async ({ page }) => {
      await signInWithMocks(page);
      const catalog = new CatalogPage(page);
      await catalog.goto(catalogCase.tab);
      const dialog = await catalog.openEdit(catalogCase.kind, 1);
      const identifier = dialog.getByLabel(catalogCase.identifierLabel);

      await identifier.fill(catalogCase.takenIdentifier);
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(errorToastMessage(page, catalogCase.duplicateMessage)).toBeVisible();
      await expect(identifier).toHaveAttribute('aria-invalid', 'true');
      await expect(identifier).toHaveAccessibleDescription(catalogCase.duplicateMessage);
      await identifier.fill(`${catalogCase.takenIdentifier}-2`);
      await expect(identifier).not.toHaveAttribute('aria-invalid', 'true');
      await expect(dialog).toBeVisible();
    });

    test('an amount the server refuses is pinned to the rate field and cleared by editing it', async ({ page }) => {
      await signInWithMocks(page);
      await refuseCreate(page, catalogCase.apiPath, 422, { detail: 'Amount must be at least 0 and at most 100,000,000.' });
      const catalog = new CatalogPage(page);
      await catalog.goto(catalogCase.tab);
      const dialog = await catalog.openCreate(catalogCase.kind);
      const rate = dialog.getByLabel(catalogCase.rateLabel);

      await fillCreateForm(dialog, catalogCase);
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(errorToastMessage(page, 'Amount must be at least 0 and at most 100,000,000.')).toBeVisible();
      await expect(rate).toHaveAttribute('aria-invalid', 'true');
      await rate.fill('6000');
      await expect(rate).not.toHaveAttribute('aria-invalid', 'true');
      await expect(dialog).toBeVisible();
    });

    test('a refusal without a message shows the kind\'s generic save failure and keeps the dialog', async ({ page }) => {
      await signInWithMocks(page);
      await refuseCreate(page, catalogCase.apiPath, 422, {});
      const catalog = new CatalogPage(page);
      await catalog.goto(catalogCase.tab);
      const dialog = await catalog.openCreate(catalogCase.kind);

      await fillCreateForm(dialog, catalogCase);
      await dialog.getByRole('button', { name: 'Save' }).click();

      await expect(errorToastMessage(page, catalogCase.saveFailedMessage)).toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel(catalogCase.identifierLabel)).toHaveValue('NEW-1');
    });
  });
}

test.describe('Catalog form rules - labour type code conflict', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('creating a labour type with a taken code is refused on the code field', async ({ page }) => {
    await signInWithMocks(page);
    const catalog = new CatalogPage(page);
    await catalog.goto('labor-types');
    const dialog = await catalog.openCreate('laborType');

    await dialog.getByLabel('Code').fill('LBR-DIAG');
    await dialog.getByLabel('Name').fill('Duplicate diagnostics');
    await dialog.getByLabel('Hourly rate (net)').fill('1000');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(errorToastMessage(page, 'A labour type with this code already exists.')).toBeVisible();
    await expect(dialog.getByLabel('Code')).toHaveAttribute('aria-invalid', 'true');
    await expect(catalog.formDialog('Create labour type')).toBeVisible();
  });
});
