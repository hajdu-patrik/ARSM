/** Quote editor header: metadata, title/notes, validity (own save action), and appointment link; fields disable rather than hide past Draft, except validity, which extends via its own endpoint (D23, see CLAUDE.md). */
import { memo, useId, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { CalendarClock } from 'lucide-react';
import { Dropdown } from '../../../components/common/Dropdown';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
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
  selectWrapperClass,
  textareaClass,
  warningNoticeSurfaceClass,
} from '../../../utils/formStyles';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
import { formatShortDate } from '../../../utils/intlFormat';
import { resolveQuoteDisplayStatus, type QuoteHeaderFieldErrors, type QuoteHeaderFormState } from '../helpers';
import { QuoteStatusBadge } from './QuoteStatusBadge';

interface QuoteEditorHeaderSectionProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteDetailDto | null;
  readonly vehicleLabel: string;
  readonly form: QuoteHeaderFormState;
  readonly setForm: Dispatch<SetStateAction<QuoteHeaderFormState>>;
  readonly errors: QuoteHeaderFieldErrors;
  readonly appointments: AppointmentDto[];
  readonly isSaving: boolean;
  readonly canEditHeader: boolean;
  readonly canChangeValidity: boolean;
  readonly onSaveValidity: () => void;
}

/** Builds the option label for one appointment: the scheduled day plus the task. */
function buildAppointmentOptionLabel(appointment: AppointmentDto, locale: string): string {
  return `${formatShortDate(appointment.scheduledDate, locale)} - ${appointment.taskDescription}`;
}

/** Picks the locked-header notice key by status: Accepted and Rejected read as closed, Sent keeps the original text. */
function resolveLockedNoticeKey(status: QuoteStatus): string {
  switch (status) {
    case 'Accepted':
      return 'quotes.headerLockedNoticeAccepted';
    case 'Rejected':
      return 'quotes.headerLockedNoticeRejected';
    default:
      return 'quotes.headerLockedNotice';
  }
}

/** Header fields of the quote editor, with an inline error bound to the title. */
export const QuoteEditorHeaderSection = memo(function QuoteEditorHeaderSection({
  t,
  locale,
  quote,
  vehicleLabel,
  form,
  setForm,
  errors,
  appointments,
  isSaving,
  canEditHeader,
  canChangeValidity,
  onSaveValidity,
}: QuoteEditorHeaderSectionProps) {
  const titleErrorId = useId();
  const isExistingQuote = quote !== null;
  // A linked appointment that the vehicle history no longer returns would
  // otherwise leave the disabled dropdown blank, hiding an existing link.
  const hasUnlistedAppointmentLink = form.appointmentId.length > 0
    && !appointments.some((appointment) => String(appointment.id) === form.appointmentId);
  const appointmentOptions = [
    { value: '', label: t('quotes.appointmentNone') },
    ...appointments.map((appointment) => ({
      value: String(appointment.id),
      label: buildAppointmentOptionLabel(appointment, locale),
    })),
    ...(hasUnlistedAppointmentLink
      ? [{ value: form.appointmentId, label: t('quotes.appointmentUnlisted', { id: form.appointmentId }) }]
      : []),
  ];

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
          <LabeledValueTile label={t('quotes.columns.createdAt')} value={formatShortDate(quote.createdAt, locale)} valueClassName="tabular-nums" />
        )}
        {quote && (
          <LabeledValueTile label={t('quotes.columns.createdBy')} value={quote.createdByMechanic?.fullName ?? t('quotes.unknownMechanic')} />
        )}
      </div>

      {quote !== null && !canEditHeader && (
        <p data-testid="quote-header-locked-notice" className={warningNoticeSurfaceClass}>{t(resolveLockedNoticeKey(quote.status))}</p>
      )}

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-title" className={labelClass}>{t('quotes.title')}</label>
        <input
          data-testid="quote-title-input"
          id="quote-title"
          type="text"
          value={form.title}
          onChange={(event) => {
            setForm((previous) => ({ ...previous, title: event.target.value }));
          }}
          className={inputClass}
          placeholder={t('quotes.titlePlaceholder')}
          maxLength={MAX_QUOTE_TITLE_LENGTH}
          disabled={isSaving || !canEditHeader}
          {...fieldErrorA11yProps(titleErrorId, errors.title)}
        />
        <FieldErrorText id={titleErrorId} messageKey={errors.title} />
      </div>

      <div className={formFieldGroupClass}>
        <label htmlFor="quote-notes" className={labelClass}>{t('quotes.notes')}</label>
        <textarea
          data-testid="quote-notes-input"
          id="quote-notes"
          value={form.notes}
          onChange={(event) => {
            setForm((previous) => ({ ...previous, notes: event.target.value }));
          }}
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
              onChange={(event) => {
                setForm((previous) => ({ ...previous, validUntil: event.target.value }));
              }}
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
          {quote?.status === 'Sent' && (
            <p className={`mt-1.5 ${mutedMetaTextClass}`}>{t('quotes.validityExtendOnlyHint')}</p>
          )}
        </div>

        <div className={formFieldGroupClass}>
          <label htmlFor="quote-appointment" className={labelClass}>{t('quotes.appointment')}</label>
          <div className={selectWrapperClass}>
            <Dropdown
              data-testid="quote-appointment-select"
              id="quote-appointment"
              size="field"
              value={form.appointmentId}
              options={appointmentOptions}
              onChange={(value) => {
                setForm((previous) => ({ ...previous, appointmentId: value }));
              }}
              disabled={isSaving || isExistingQuote}
            />
          </div>
          {isExistingQuote && (
            <p className={`mt-1.5 ${mutedMetaTextClass}`}>{t('quotes.appointmentFixedHint')}</p>
          )}
        </div>
      </div>
    </section>
  );
});
