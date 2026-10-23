/** Modal dialog showing a vehicle's historical appointment: status, task, timestamps, and vehicle info. */
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, FileText } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Modal } from '../../../components/common/Modal';
import { useAppointmentQuoteLink } from '../../../hooks/useAppointmentQuoteLink';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import {
  compactChipNeutralButtonClass,
  compactDataSurfaceClass,
  compactInlineClusterClass,
  compactPrimaryValueTextClass,
  mutedMetaTextClass,
  smallIconClass,
} from '../../../utils/formStyles';
import { formatShortDateTime } from '../../../utils/intlFormat';
import { StatusBadge } from '../../Scheduler/components/shared/StatusBadge';

interface HistoryAppointmentModalProps {
  readonly appointment: AppointmentDto | null;
  readonly locale: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

/** Shows one history appointment read-only, with a shortcut that opens it in the scheduler. */
export const HistoryAppointmentModal = memo(function HistoryAppointmentModal({
  appointment,
  locale,
  isOpen,
  onClose,
}: HistoryAppointmentModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenInScheduler = useCallback(() => {
    onClose();
    void navigate('/', {
      state: {
        focusAppointmentId: appointment?.id,
        focusScheduledDate: appointment?.scheduledDate,
      },
    });
  }, [appointment?.id, appointment?.scheduledDate, navigate, onClose]);

  const { quoteId, openQuote } = useAppointmentQuoteLink(appointment?.id ?? null, isOpen);

  const handleOpenQuote = useCallback(() => {
    onClose();
    openQuote();
  }, [onClose, openQuote]);

  if (!appointment) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('customers.historyModalTitle')}
      widthClassName="max-w-xl"
    >
      <div className="min-w-0 space-y-4">
        <div className={compactInlineClusterClass}>
          <StatusBadge status={appointment.status} className="min-h-0 w-fit px-2.5 py-1 text-xs" />
          <button
            type="button"
            onClick={handleOpenInScheduler}
            className={compactChipNeutralButtonClass}
            title={t('customers.openInScheduler')}
            aria-label={t('customers.openInScheduler')}
          >
            <CalendarDays className={smallIconClass} />
            <span className="min-w-0 whitespace-normal text-center">{t('customers.checkAppointment')}</span>
          </button>
          {quoteId !== null && (
            <button
              type="button"
              onClick={handleOpenQuote}
              className={compactChipNeutralButtonClass}
              title={t('common.actions.openQuote')}
              aria-label={t('common.actions.openQuote')}
            >
              <FileText className={smallIconClass} />
              <span className="min-w-0 whitespace-normal text-center">{t('common.actions.openQuote')}</span>
            </button>
          )}
        </div>

        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('scheduler.repairTask')}</p>
          <p className={`mt-0.5 break-words ${compactPrimaryValueTextClass}`}>{appointment.taskDescription}</p>
        </div>

        <div className="divide-y divide-ui-border/50 rounded-xl border border-ui-border bg-ui-input">
          <div className="min-w-0 px-3 py-2">
            <p className={mutedMetaTextClass}>{t('customers.intakeCreatedAt')}</p>
            <p className={`[overflow-wrap:anywhere] ${compactPrimaryValueTextClass}`}>{formatShortDateTime(appointment.intakeCreatedAt, locale)}</p>
          </div>
          <div className="min-w-0 px-3 py-2">
            <p className={mutedMetaTextClass}>{t('customers.dueDateTime')}</p>
            <p className={`[overflow-wrap:anywhere] ${compactPrimaryValueTextClass}`}>{formatShortDateTime(appointment.dueDateTime, locale)}</p>
          </div>
          {appointment.completedAt && (
            <div className="min-w-0 px-3 py-2">
              <p className={mutedMetaTextClass}>{t('customers.completedAt')}</p>
              <p className={`[overflow-wrap:anywhere] ${compactPrimaryValueTextClass}`}>{formatShortDateTime(appointment.completedAt, locale)}</p>
            </div>
          )}
          {appointment.canceledAt && (
            <div className="min-w-0 px-3 py-2">
              <p className={mutedMetaTextClass}>{t('customers.cancelledAt')}</p>
              <p className={`[overflow-wrap:anywhere] ${compactPrimaryValueTextClass}`}>{formatShortDateTime(appointment.canceledAt, locale)}</p>
            </div>
          )}
        </div>

        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('common.fields.vehicle')}</p>
          <p className={`[overflow-wrap:anywhere] ${compactPrimaryValueTextClass}`}>
            {appointment.vehicle.brand} {appointment.vehicle.model} ({appointment.vehicle.year})
          </p>
          <p className={`mt-0.5 [overflow-wrap:anywhere] ${mutedMetaTextClass}`}>{appointment.vehicle.licensePlate}</p>
        </div>
      </div>
    </Modal>
  );
});
