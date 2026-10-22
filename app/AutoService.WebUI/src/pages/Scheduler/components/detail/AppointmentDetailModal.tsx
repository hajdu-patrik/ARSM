/** Appointment detail modal: view, edit, status, mechanic assignment and delete of one appointment. */
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AppointmentDto,
  AppointmentStatus,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
} from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import { getDueState } from '../../utils/due-date';
import { formatDueExactDateTime, formatLongDateTime } from '../../utils/scheduler-datetime';
import { useAdminMechanics } from '../../hooks/useAdminMechanics';
import { AppointmentDetailBody } from './AppointmentDetailModal.sections';
import { AppointmentDetailFooter } from './AppointmentDetailModal.footer';
import { AppointmentDetailConfirmModals } from './AppointmentDetailConfirmModals';
import { useAppointmentDetailActions } from './AppointmentDetailModal.actions';
import { useAppointmentDelete } from './AppointmentDetailModal.delete';
import { useAppointmentEditing } from './AppointmentDetailModal.editing';

/** The open appointment, the viewer's role and the page-level mutation handlers. */
interface AppointmentDetailModalProps {
  readonly appointment: AppointmentDto | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus, version: number) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onAdminAssign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onAdminUnassign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onUpdate: (
    id: number,
    request: UpdateAppointmentRequest,
    vehicleRequest?: UpdateAppointmentVehicleRequest,
  ) => Promise<void>;
  readonly onDelete: (id: number) => Promise<void>;
}

type AppointmentDetailDialogProps = Omit<AppointmentDetailModalProps, 'appointment' | 'isOpen'> & {
  readonly appointment: AppointmentDto;
};

/** The open detail dialog; it owns all per-appointment UI state, which starts fresh for every appointment. */
function AppointmentDetailDialog({
  appointment,
  onClose,
  currentMechanicId,
  isAdmin,
  onClaim,
  onStatusChange,
  onUnclaim,
  onAdminAssign,
  onAdminUnassign,
  onUpdate,
  onDelete,
}: AppointmentDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const { allMechanics } = useAdminMechanics(isAdmin);
  const actions = useAppointmentDetailActions({
    appointmentId: appointment.id,
    appointmentVersion: appointment.version,
    onClaim,
    onStatusChange,
    onUnclaim,
    onAdminAssign,
    onAdminUnassign,
  });
  const editing = useAppointmentEditing({ appointment, onUpdate });
  const deletion = useAppointmentDelete({ appointmentId: appointment.id, onDelete });
  const { cancelEditing, isEditing } = editing;

  const handleCloseDetailModal = useCallback(() => {
    if (isEditing) {
      cancelEditing();
      return;
    }

    onClose();
  }, [cancelEditing, isEditing, onClose]);

  const isAssigned = currentMechanicId !== undefined &&
    appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const isInProgress = appointment.status === 'InProgress';
  const showEdit = isAdmin || isAssigned;
  const canClaim = !isAdmin && !isAssigned && isInProgress;
  const canUnclaim = isAssigned && isInProgress && appointment.mechanics.length > 1;
  const canChangeStatus = isAdmin || isAssigned;

  const assignedMechanicIds = new Set(appointment.mechanics.map((mechanic) => mechanic.id));
  const availableMechanics = allMechanics.filter((mechanic) => !assignedMechanicIds.has(mechanic.personId));

  const footer = (
    <AppointmentDetailFooter
      appointment={appointment}
      showEdit={showEdit}
      isEditing={isEditing}
      isSaving={editing.isSaving}
      isSaveEnabled={editing.isSaveEnabled}
      canChangeStatus={canChangeStatus}
      isUpdating={actions.isUpdatingStatus}
      isAdmin={isAdmin}
      isDeleting={deletion.isDeleting}
      onDeleteClick={deletion.openDeleteConfirm}
      t={t}
      onStartEdit={editing.startEditing}
      onSave={editing.requestSave}
      onStatusChange={actions.requestStatusChange}
    />
  );

  return (
    <>
      <Modal
        isOpen
        onClose={handleCloseDetailModal}
        title={t('scheduler.detail.title')}
        widthClassName="max-w-2xl"
        footer={footer}
        fitViewport
      >
        <AppointmentDetailBody
          appointment={appointment}
          isAdmin={isAdmin}
          isEditing={isEditing}
          editForm={editing.editForm}
          formattedDate={formatLongDateTime(appointment.scheduledDate, i18n.language)}
          dueDateLabel={formatDueExactDateTime(appointment.dueDateTime, i18n.language)}
          dueState={getDueState(appointment.dueDateTime)}
          availableMechanics={availableMechanics}
          selectedNewMechanicId={actions.selectedNewMechanicId}
          canClaim={canClaim}
          canUnclaim={canUnclaim}
          isClaiming={actions.isClaiming}
          isAssigning={actions.isAssigning}
          isClosedForMechanicMutations={!isInProgress}
          isUnclaiming={actions.isUnclaiming}
          t={t}
          locale={i18n.language}
          onEditField={editing.changeField}
          onClaim={() => {
            if (canClaim) {
              actions.openClaimConfirm();
            }
          }}
          onUnclaim={() => {
            if (canUnclaim) {
              actions.openUnclaimConfirm();
            }
          }}
          onSelectNewMechanic={actions.selectNewMechanic}
          onAdminAssign={actions.assignSelectedMechanic}
          onAdminUnassign={actions.unassignMechanic}
          currentMechanicId={currentMechanicId}
        />
      </Modal>

      <AppointmentDetailConfirmModals
        pendingStatusChange={actions.pendingStatusChange}
        isUpdating={actions.isUpdatingStatus}
        onCloseStatusConfirm={actions.closeStatusConfirm}
        onConfirmStatusChange={actions.confirmStatusChange}
        isClaimConfirmOpen={actions.isClaimConfirmOpen}
        isClaiming={actions.isClaiming}
        onCloseClaimConfirm={actions.closeClaimConfirm}
        onConfirmClaim={actions.confirmClaim}
        isUnclaimConfirmOpen={actions.isUnclaimConfirmOpen}
        isUnclaiming={actions.isUnclaiming}
        onCloseUnclaimConfirm={actions.closeUnclaimConfirm}
        onConfirmUnclaim={actions.confirmUnclaim}
        isSaveConfirmOpen={editing.isSaveConfirmOpen}
        isSaving={editing.isSaving}
        onCloseSaveConfirm={editing.closeSaveConfirm}
        onConfirmSave={editing.confirmSave}
        isDeleteConfirmOpen={deletion.isDeleteConfirmOpen}
        isDeleting={deletion.isDeleting}
        onCloseDeleteConfirm={deletion.closeDeleteConfirm}
        onConfirmDelete={deletion.confirmDelete}
      />
    </>
  );
}

/** Detail modal; the dialog mounts only while an appointment is open and is keyed by its id. */
export const AppointmentDetailModal = memo(function AppointmentDetailModal({
  appointment,
  isOpen,
  ...dialogProps
}: AppointmentDetailModalProps) {
  if (!isOpen || appointment === null) {
    return null;
  }

  return <AppointmentDetailDialog key={appointment.id} appointment={appointment} {...dialogProps} />;
});
