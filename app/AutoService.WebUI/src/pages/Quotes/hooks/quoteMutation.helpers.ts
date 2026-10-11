/** Payload builders for the quote header and quote line forms. */
import type {
  CreateQuoteRequest,
  QuoteLineRequest,
  UpdateQuoteRequest,
} from '../../../types/quotes/quotes.types';
import {
  toValidUntilIso,
  validateQuoteHeaderForm,
  validateQuoteLineForm,
  type QuoteHeaderFormState,
  type QuoteLineFormState,
} from '../helpers';

/** Quote writes fail fast while offline instead of pausing: a paused write would fire minutes later against a quote the mechanic has left. */
export const QUOTE_WRITE_NETWORK_MODE = 'always';

/** A built payload, or the i18n key of the first field error that blocked it. */
type PayloadResult<TPayload> =
  | { readonly ok: true; readonly payload: TPayload }
  | { readonly ok: false; readonly fieldError: string };

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
  const { title: titleError } = validateQuoteHeaderForm(form);

  if (titleError !== undefined) {
    return { ok: false, fieldError: titleError };
  }

  const notes = form.notes.trim();

  return {
    ok: true,
    payload: {
      title: form.title.trim(),
      notes: notes.length > 0 ? notes : null,
      validUntil: form.validUntil.length > 0 ? toValidUntilIso(form.validUntil) : null,
      appointmentId: parseAppointmentId(form.appointmentId),
    },
  };
}

/** Builds the header-edit payload; ValidUntil is absent on purpose since extending validity is its own endpoint/action (D23). */
export function buildUpdateQuoteRequest(form: QuoteHeaderFormState, version: number): PayloadResult<UpdateQuoteRequest> {
  const { title: titleError } = validateQuoteHeaderForm(form);

  if (titleError !== undefined) {
    return { ok: false, fieldError: titleError };
  }

  const notes = form.notes.trim();

  return {
    ok: true,
    payload: { title: form.title.trim(), notes: notes.length > 0 ? notes : null, version },
  };
}

/** Builds the unified line payload (D40): the catalog reference carries the snapshot, any field still filled overrides it server-side. */
export function buildQuoteLineRequest(form: QuoteLineFormState, version: number): PayloadResult<QuoteLineRequest> {
  const { quantity: quantityError, description: descriptionError, netUnitPrice: priceError } = validateQuoteLineForm(form);
  const fieldError = quantityError ?? descriptionError ?? priceError;

  if (fieldError !== undefined) {
    return { ok: false, fieldError };
  }

  const description = form.description.trim();
  const hasTypedNetUnitPrice = form.netUnitPrice.trim().length > 0;
  const catalogId = form.catalogId.length > 0 ? Number(form.catalogId) : null;

  return {
    ok: true,
    payload: {
      lineKind: form.lineKind,
      quantity: Number(form.quantity),
      partId: form.lineKind === 'Part' ? catalogId : null,
      laborTypeId: form.lineKind === 'Labor' ? catalogId : null,
      description: description.length > 0 ? description : null,
      netUnitPrice: hasTypedNetUnitPrice ? Number(form.netUnitPrice) : null,
      vatRatePercent: form.vatRatePercent,
      version,
    },
  };
}
