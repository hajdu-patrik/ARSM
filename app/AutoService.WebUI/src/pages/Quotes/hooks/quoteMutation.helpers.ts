/**
 * Payload builders for the quote header and quote line forms.
 * @module pages/Quotes/hooks/quoteMutation.helpers
 */
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

/**
 * Parses the optional appointment link from the header form.
 * @param appointmentId Appointment select value; an empty string means no link.
 * @returns Appointment identifier, or null when unlinked.
 */
function parseAppointmentId(appointmentId: string): number | null {
  if (appointmentId.trim().length === 0) {
    return null;
  }

  const parsed = Number(appointmentId);
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * Builds the draft-creation payload from header form state.
 * @param form Header form state.
 * @returns Payload and optional field error key.
 */
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

/**
 * Builds the header-edit payload from header form state. ValidUntil is absent
 * on purpose: extending validity is its own endpoint and its own action (D23).
 * @param form Header form state.
 * @param version Version the client last saw.
 * @returns Payload and optional field error key.
 */
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

/**
 * Reports whether the line form has everything a payload needs: a quantity,
 * and either a catalog reference to snapshot from or a full manual triplet.
 * @param form Line form state.
 * @returns True when the form can be submitted.
 */
export function hasRequiredQuoteLineFields(form: QuoteLineFormState): boolean {
  if (form.quantity.trim().length === 0) {
    return false;
  }

  if (form.catalogId.length > 0) {
    return true;
  }

  return form.description.trim().length > 0 && form.netUnitPrice.trim().length > 0;
}

/**
 * Builds the unified line payload (D40): the catalog reference carries the
 * snapshot, and any field the form still holds is sent as an override, which
 * the server prefers over the snapshot.
 * @param form Line form state.
 * @param version Version the client last saw.
 * @returns Payload and optional field error key.
 */
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
