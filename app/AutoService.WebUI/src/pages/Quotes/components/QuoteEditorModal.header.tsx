/**
 * Quote editor header section: the quote's own metadata tiles, the title and
 * notes fields, the validity deadline with its own save action, and the
 * optional appointment link.
 *
 * Fields are disabled rather than hidden once the quote leaves Draft, and the
 * section says why. Validity is the single exception: it keeps its own action
 * because the API extends it through a separate endpoint (D23).
 * @module pages/Quotes/components/QuoteEditorModal.header
 */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { CalendarClock } from 'lucide-react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import {
  MAX_QUOTE_NOTES_LENGTH,
  MAX_QUOTE_TITLE_LENGTH,
  type QuoteDetailDto,
} from '../../../types/quotes/quotes.types';
import {
  compactDataSurfaceClass,
  compactPrimaryValueTextClass,
  compactTwoColumnGridClass,
  formFieldGridClass,
  formFieldGroupClass,
  inputClass,
  intakeTextareaClass,
  labelClass,
  mutedMetaTextClass,
  referenceChipNeutralButtonClass,
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

/**
 * Builds the option label for one appointment: the scheduled day plus the task.
 * @param appointment Appointment offered as a quote link.
 * @param locale Current i18n locale.
 * @returns Option label text.
 */
function buildAppointmentOptionLabel(appointment: AppointmentDto, locale: string): string {
  return `${formatQuoteDate(appointment.scheduledDate, locale)} - ${appointment.taskDescription}`;
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
        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('quotes.columns.vehicle')}</p>
          <p className={`truncate ${compactPrimaryValueTextClass}`}>{vehicleLabel}</p>
        </div>
        {quote && (
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.status')}</p>
            <QuoteStatusBadge status={resolveQuoteDisplayStatus(quote)} />
          </div>
        )}
        {quote && (
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.createdAt')}</p>
            <p className={`truncate tabular-nums ${compactPrimaryValueTextClass}`}>{formatQuoteDate(quote.createdAt, locale)}</p>
          </div>
        )}
        {quote && (
          <div className={compactDataSurfaceClass}>
            <p className={mutedMetaTextClass}>{t('quotes.columns.createdBy')}</p>
            <p className={`truncate ${compactPrimaryValueTextClass}`}>{quote.createdByMechanic?.fullName ?? t('quotes.unknownMechanic')}</p>
          </div>
        )}
      </div>

      {isExistingQuote && !canEditHeader && (
        <p data-testid="quote-header-locked-notice" className={warningNoticeSurfaceClass}>{t('quotes.headerLockedNotice')}</p>
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
          className={`${intakeTextareaClass} min-h-[5.5rem]`}
          placeholder={t('quotes.notesPlaceholder')}
          maxLength={MAX_QUOTE_NOTES_LENGTH}
          rows={3}
          disabled={isSaving || !canEditHeader}
        />
      </div>

      <div className={formFieldGridClass}>
        <div className={formFieldGroupClass}>
          <label htmlFor="quote-valid-until" className={labelClass}>{t('quotes.validUntil')}</label>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                className={referenceChipNeutralButtonClass}
              >
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('quotes.saveValidUntil')}</span>
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
