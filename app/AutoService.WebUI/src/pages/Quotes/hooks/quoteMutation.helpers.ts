/** Payload builders for the quote header and quote line forms. */
import type {
  CreateQuoteRequest,
  QuoteLineRequest,
  UpdateQuoteRequest,
} from '../../../types/quotes/quotes.types';
import { toValidUntilIso, type QuoteHeaderFormState, type QuoteLineFormState } from '../helpers';

/** A built payload, or the i18n key of the field error that blocked it. */
interface PayloadResult<TPayload> {
  payload: TPayload;
  fieldError: string | null;
}

/** Parses the optional appointment link from the header form. */
function parseAppointmentId(appointmentId: string): number | null {
  if (appointmentId.trim().length === 0) {
    return null;
  }

  const parsed = Number(appointmentId);
  return Number.isInteger(parsed) ? parsed : null;
}

/** Builds the draft-creation payload from header form state. */
export function buildCreateQuoteRequest(form: QuoteHeaderFormState): PayloadResult<CreateQuoteRequest> {
  const title = form.title.trim();

  if (title.length === 0) {
    return { payload: null as never, fieldError: 'quotes.errors.titleRequired' };
  }

  const notes = form.notes.trim();

  return {
    payload: {
      title,
      notes: notes.length > 0 ? notes : null,
      validUntil: form.validUntil.length > 0 ? toValidUntilIso(form.validUntil) : null,
      appointmentId: parseAppointmentId(form.appointmentId),
    },
    fieldError: null,
  };
}

/** Builds the header-edit payload; ValidUntil is absent on purpose since extending validity is its own endpoint/action (D23). */
export function buildUpdateQuoteRequest(form: QuoteHeaderFormState, version: number): PayloadResult<UpdateQuoteRequest> {
  const title = form.title.trim();

  if (title.length === 0) {
    return { payload: null as never, fieldError: 'quotes.errors.titleRequired' };
  }

  const notes = form.notes.trim();

  return {
    payload: { title, notes: notes.length > 0 ? notes : null, version },
    fieldError: null,
  };
}

/** Builds the unified line payload (D40): the catalog reference carries the snapshot, any field still filled overrides it server-side. */
export function buildQuoteLineRequest(form: QuoteLineFormState, version: number): PayloadResult<QuoteLineRequest> {
  const quantity = Number(form.quantity);

  if (Number.isNaN(quantity) || quantity <= 0) {
    return { payload: null as never, fieldError: 'quotes.errors.invalidQuantity' };
  }

  const description = form.description.trim();
  const hasCatalogReference = form.catalogId.length > 0;

  if (!hasCatalogReference && description.length === 0) {
    return { payload: null as never, fieldError: 'quotes.errors.lineFieldsRequired' };
  }

  const hasTypedNetUnitPrice = form.netUnitPrice.trim().length > 0;
  const netUnitPrice = Number(form.netUnitPrice);

  if (hasTypedNetUnitPrice && Number.isNaN(netUnitPrice)) {
    return { payload: null as never, fieldError: 'quotes.errors.invalidMoney' };
  }

  if (!hasCatalogReference && !hasTypedNetUnitPrice) {
    return { payload: null as never, fieldError: 'quotes.errors.lineFieldsRequired' };
  }

  const catalogId = hasCatalogReference ? Number(form.catalogId) : null;

  return {
    payload: {
      lineKind: form.lineKind,
      quantity,
      partId: form.lineKind === 'Part' ? catalogId : null,
      laborTypeId: form.lineKind === 'Labor' ? catalogId : null,
      description: description.length > 0 ? description : null,
      netUnitPrice: hasTypedNetUnitPrice ? netUnitPrice : null,
      vatRatePercent: form.vatRatePercent,
      version,
    },
    fieldError: null,
  };
}
