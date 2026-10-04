/** Quote editor header: metadata, title/notes, validity (own save action), and appointment link; fields disable rather than hide past Draft, except validity, which extends via its own endpoint (D23, see CLAUDE.md). */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { CalendarClock } from 'lucide-react';
import { LabeledValueTile } from '../../../components/common/LabeledValueTile';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import {
  MAX_QUOTE_NOTES_LENGTH,
  MAX_QUOTE_TITLE_LENGTH,
  type QuoteDetailDto,
  type QuoteStatus,
} from '../../../types/quotes/quotes.types';
import {
  compactDataSurfaceClass,
  compactInlineClusterClass,
  compactTwoColumnGridClass,
  defaultIconClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  labelClass,
  mutedMetaTextClass,
  referenceChipNeutralWrapButtonClass,
  textareaClass,
  warningNoticeSurfaceClass,
} from '../../../utils/formStyles';
import { formatQuoteDate, resolveQuoteDisplayStatus, type QuoteHeaderFormState } from '../helpers';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface QuoteEditorHeaderSectionProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteDetailDto | null;
  readonly vehicleLabel: string;
  readonly form: QuoteHeaderFormState;
  readonly setForm: Dispatch<SetStateAction<QuoteHeaderFormState>>;
  readonly appointments: AppointmentDto[];
  readonly isSaving: boolean;
  readonly canEditHeader: boolean;
  readonly canChangeValidity: boolean;
  readonly onSaveValidity: () => void;
}

/** Builds the option label for one appointment: the scheduled day plus the task. */
function buildAppointmentOptionLabel(appointment: AppointmentDto, locale: string): string {
  return `${formatQuoteDate(appointment.scheduledDate, locale)} - ${appointment.taskDescription}`;
}

/** Picks the locked-header notice key by status: Accepted and Rejected read as closed, Sent keeps the original text. */
function resolveLockedNoticeKey(status: QuoteStatus | undefined): string {
  switch (status) {
    case 'Accepted':
      return 'quotes.headerLockedNoticeAccepted';
    case 'Rejected':
      return 'quotes.headerLockedNoticeRejected';
    default:
      return 'quotes.headerLockedNotice';
  }
}

const QuoteEditorHeaderSectionComponent = memo(function QuoteEditorHeaderSection({
  t,
  locale,
  quote,
  vehicleLabel,
  form,
  setForm,
  appointments,
  isSaving,
  canEditHeader,
  canChangeValidity,
  onSaveValidity,
}: QuoteEditorHeaderSectionProps) {
  const isExistingQuote = quote !== null;
  // A linked appointment that the vehicle history no longer returns would
  // otherwise leave the disabled select blank, hiding an existing link.
  const hasUnlistedAppointmentLink = form.appointmentId.length > 0
    && !appointments.some((appointment) => String(appointment.id) === form.appointmentId);

  return (
    <section className="min-w-0 space-y-3">
      <div className={compactTwoColumnGridClass}>
        <LabeledValueTile label={t('common.fields.vehicle')} value={vehicleLabel} />
        {quote && (
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.status')}</p>
            <QuoteStatusBadge status={resolveQuoteDisplayStatus(quote)} />
          </div>
        )}
        {quote && (
          <LabeledValueTile label={t('quotes.columns.createdAt')} value={formatQuoteDate(quote.createdAt, locale)} valueClassName="tabular-nums" />
        )}
        {quote && (
          <LabeledValueTile label={t('quotes.columns.createdBy')} value={quote.createdByMechanic?.fullName ?? t('quotes.unknownMechanic')} />
        )}
      </div>

      {isExistingQuote && !canEditHeader && (
        <p data-testid="quote-header-locked-notice" className={warningNoticeSurfaceClass}>{t(resolveLockedNoticeKey(quote?.status))}</p>
      )}

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-title" className={labelClass}>{t('quotes.title')}</label>
        <input
          data-testid="quote-title-input"
          id="quote-title"
          type="text"
          value={form.title}
          onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
          className={inputClass}
          placeholder={t('quotes.titlePlaceholder')}
          maxLength={MAX_QUOTE_TITLE_LENGTH}
          disabled={isSaving || !canEditHeader}
        />
      </div>

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-notes" className={labelClass}>{t('quotes.notes')}</label>
        <textarea
          data-testid="quote-notes-input"
          id="quote-notes"
          value={form.notes}
          onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
          className={textareaClass}
          placeholder={t('quotes.notesPlaceholder')}
          maxLength={MAX_QUOTE_NOTES_LENGTH}
          rows={3}
          disabled={isSaving || !canEditHeader}
        />
      </div>

      <div className={formFieldGridClass}>
        <div className={formFieldGroupClass}>
          <label htmlFor="quote-valid-until" className={labelClass}>{t('quotes.validUntil')}</label>
          <div className={compactInlineClusterClass}>
            <input
              data-testid="quote-valid-until-input"
              id="quote-valid-until"
              type="date"
              value={form.validUntil}
              onChange={(event) => setForm((previous) => ({ ...previous, validUntil: event.target.value }))}
              className={`${inputClass} flex-1`}
              disabled={isSaving || !canChangeValidity}
            />
            {isExistingQuote && (
              <button
                data-testid="quote-save-validity-button"
                type="button"
                onClick={onSaveValidity}
                disabled={isSaving || !canChangeValidity || form.validUntil.length === 0}
                className={referenceChipNeutralWrapButtonClass}
              >
                <CalendarClock className={defaultIconClass} />
                <span className="min-w-0 text-center">{t('quotes.saveValidUntil')}</span>
              </button>
            )}
          </div>
          {isExistingQuote && quote?.status === 'Sent' && (
            <p className={`mt-1.5 ${mutedMetaTextClass}`}>{t('quotes.validityExtendOnlyHint')}</p>
          )}
        </div>

        <div className={formFieldGroupClass}>
          <label htmlFor="quote-appointment" className={labelClass}>{t('quotes.appointment')}</label>
          <select
            data-testid="quote-appointment-select"
            id="quote-appointment"
            value={form.appointmentId}
            onChange={(event) => setForm((previous) => ({ ...previous, appointmentId: event.target.value }))}
            className={`${inputClass} min-w-0 truncate`}
            disabled={isSaving || isExistingQuote}
          >
            <option value="">{t('quotes.appointmentNone')}</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {buildAppointmentOptionLabel(appointment, locale)}
              </option>
            ))}
            {hasUnlistedAppointmentLink && (
              <option value={form.appointmentId}>{t('quotes.appointmentUnlisted', { id: form.appointmentId })}</option>
            )}
          </select>
          {isExistingQuote && (
            <p className={`mt-1.5 ${mutedMetaTextClass}`}>{t('quotes.appointmentFixedHint')}</p>
          )}
        </div>
      </div>
    </section>
  );
});

QuoteEditorHeaderSectionComponent.displayName = 'QuoteEditorHeaderSection';

export const QuoteEditorHeaderSection = QuoteEditorHeaderSectionComponent;
