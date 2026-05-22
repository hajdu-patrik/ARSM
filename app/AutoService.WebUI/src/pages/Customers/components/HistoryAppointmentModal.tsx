/**
 * Modal dialog displaying historical appointment details for a vehicle.
 * Renders appointment status, task description, timestamps, and vehicle info.
 * @module HistoryAppointmentModal
 */
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/common/Modal';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import { compactDataSurfaceClass, compactPrimaryValueTextClass, mutedMetaTextClass, referenceChipNeutralButtonClass } from '../../../utils/formStyles';
import { formatDateTime } from '../helpers';
import { StatusBadge } from '../../Scheduler/components/shared/StatusBadge';

interface HistoryAppointmentModalProps {
  readonly appointment: AppointmentDto | null;
  readonly locale: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const HistoryAppointmentModalComponent = memo(function HistoryAppointmentModal({
  appointment,
  locale,
  isOpen,
  onClose,
}: HistoryAppointmentModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenInScheduler = useCallback(() => {
    onClose();
    navigate('/', {
      state: {
        focusAppointmentId: appointment?.id,
        focusScheduledDate: appointment?.scheduledDate,
      },
    });
  }, [appointment?.id, appointment?.scheduledDate, navigate, onClose]);

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
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} className="min-h-0 w-fit px-2.5 py-1 text-xs" />
          <button
            type="button"
            onClick={handleOpenInScheduler}
            className={referenceChipNeutralButtonClass}
            title={t('customers.openInScheduler')}
            aria-label={t('customers.openInScheduler')}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('customers.checkAppointment')}</span>
          </button>
        </div>

        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('scheduler.repairTask')}</p>
          <p className={`mt-0.5 break-words ${compactPrimaryValueTextClass}`}>{appointment.taskDescription}</p>
        </div>

        <div className="divide-y divide-arsm-border/50 rounded-xl border border-arsm-border bg-arsm-card dark:divide-arsm-border-dark/50 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
          <div className="min-w-0 px-3 py-2">
            <p className={mutedMetaTextClass}>{t('customers.intakeCreatedAt')}</p>
            <p className={`truncate ${compactPrimaryValueTextClass}`}>{formatDateTime(appointment.intakeCreatedAt, locale)}</p>
          </div>
          <div className="min-w-0 px-3 py-2">
            <p className={mutedMetaTextClass}>{t('customers.dueDateTime')}</p>
            <p className={`truncate ${compactPrimaryValueTextClass}`}>{formatDateTime(appointment.dueDateTime, locale)}</p>
          </div>
          {appointment.completedAt && (
            <div className="min-w-0 px-3 py-2">
              <p className={mutedMetaTextClass}>{t('customers.completedAt')}</p>
              <p className={`truncate ${compactPrimaryValueTextClass}`}>{formatDateTime(appointment.completedAt, locale)}</p>
            </div>
          )}
          {appointment.canceledAt && (
            <div className="min-w-0 px-3 py-2">
              <p className={mutedMetaTextClass}>{t('customers.cancelledAt')}</p>
              <p className={`truncate ${compactPrimaryValueTextClass}`}>{formatDateTime(appointment.canceledAt, locale)}</p>
            </div>
          )}
        </div>

        <div className={compactDataSurfaceClass}>
          <p className={mutedMetaTextClass}>{t('scheduler.detail.vehicle')}</p>
          <p className={`truncate ${compactPrimaryValueTextClass}`}>
            {appointment.vehicle.brand} {appointment.vehicle.model} ({appointment.vehicle.year})
          </p>
          <p className={`mt-0.5 truncate ${mutedMetaTextClass}`}>{appointment.vehicle.licensePlate}</p>
        </div>
      </div>
    </Modal>
  );
});

HistoryAppointmentModalComponent.displayName = 'HistoryAppointmentModal';

export const HistoryAppointmentModal = HistoryAppointmentModalComponent;
