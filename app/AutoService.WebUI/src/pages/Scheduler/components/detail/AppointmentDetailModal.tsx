import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AppointmentDto,
  AppointmentStatus,
  UpdateAppointmentRequest,
  UpdateAppointmentVehicleRequest,
} from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import { useToastStore } from '../../../../store/toast.store';
import { getDueState } from '../../utils/due-date';
import { formatDueExactDateTime, formatLongDateTime } from '../../utils/scheduler-datetime';
import { useAdminMechanics } from '../../hooks/useAdminMechanics';
import { AppointmentDetailBody } from './AppointmentDetailModal.sections';
import { AppointmentDetailFooter } from './AppointmentDetailModal.footer';
import { AppointmentDetailConfirmModals } from './AppointmentDetailConfirmModals';
import {
  type EditFormState,
  buildEditForm,
  buildUpdateRequestFromEditForm,
  buildUpdatedAppointmentSnapshot,
  normalizeEditFieldValue,
} from './AppointmentDetailModal.edit';

interface AppointmentDetailModalProps {
  readonly appointment: AppointmentDto | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentMechanicId: number | undefined;
  readonly isAdmin: boolean;
  readonly onClaim: (id: number) => Promise<void>;
  readonly onStatusChange: (id: number, status: AppointmentStatus) => Promise<void>;
  readonly onUnclaim: (id: number) => Promise<void>;
  readonly onAdminAssign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onAdminUnassign: (appointmentId: number, mechanicId: number) => Promise<void>;
  readonly onUpdate: (
    id: number,
    request: UpdateAppointmentRequest,
    vehicleRequest?: UpdateAppointmentVehicleRequest,
  ) => Promise<void>;
}

const AppointmentDetailModalComponent = memo(function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  currentMechanicId,
  isAdmin,
  onClaim,
  onStatusChange,
  onUnclaim,
  onAdminAssign,
  onAdminUnassign,
  onUpdate,
}: AppointmentDetailModalProps) {
  const { t, i18n } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);

  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnclaiming, setIsUnclaiming] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedNewMechanicId, setSelectedNewMechanicId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const [pendingStatusChange, setPendingStatusChange] = useState<AppointmentStatus | null>(null);
  const [isUnclaimConfirmOpen, setIsUnclaimConfirmOpen] = useState(false);

  const initializedAppointmentIdRef = useRef<number | null>(null);
  const { allMechanics } = useAdminMechanics(isAdmin, isOpen);

  useEffect(() => {
    if (!isOpen || !appointment) {
      initializedAppointmentIdRef.current = null;
      setEditForm(null);
      setIsEditing(false);
      setPendingStatusChange(null);
      setIsUnclaimConfirmOpen(false);
      return;
    }

    if (initializedAppointmentIdRef.current === appointment.id) {
      return;
    }

    initializedAppointmentIdRef.current = appointment.id;
    setEditForm(buildEditForm(appointment));
    setIsEditing(false);
    setPendingStatusChange(null);
    setIsUnclaimConfirmOpen(false);
  }, [appointment, isOpen]);

  const handleClaim = useCallback(async () => {
    if (!appointment) {
      return;
    }

    setIsClaiming(true);
    try {
      await onClaim(appointment.id);
    } finally {
      setIsClaiming(false);
    }
  }, [appointment, onClaim]);

  const handleStatusChangeConfirmed = useCallback(async () => {
    if (!appointment || pendingStatusChange === null) {
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, pendingStatusChange);
      setPendingStatusChange(null);
    } finally {
      setIsUpdating(false);
    }
  }, [appointment, onStatusChange, pendingStatusChange]);

  const handleUnclaimConfirmed = useCallback(async () => {
    if (!appointment) {
      return;
    }

    setIsUnclaiming(true);
    try {
      await onUnclaim(appointment.id);
      setIsUnclaimConfirmOpen(false);
    } finally {
      setIsUnclaiming(false);
    }
  }, [appointment, onUnclaim]);

  const handleAdminAssign = useCallback(async () => {
    if (!appointment || !selectedNewMechanicId) {
      return;
    }

    setIsAssigning(true);
    try {
      await onAdminAssign(appointment.id, Number(selectedNewMechanicId));
      setSelectedNewMechanicId('');
    } finally {
      setIsAssigning(false);
    }
  }, [appointment, onAdminAssign, selectedNewMechanicId]);

  const handleAdminUnassign = useCallback(async (mechanicId: number) => {
    if (!appointment) {
      return;
    }

    setIsAssigning(true);
    try {
      await onAdminUnassign(appointment.id, mechanicId);
    } finally {
      setIsAssigning(false);
    }
  }, [appointment, onAdminUnassign]);

  const handleEditField = useCallback((field: keyof EditFormState, value: string) => {
    setEditForm((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        [field]: normalizeEditFieldValue(field, value),
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!appointment || !editForm) {
      return;
    }

    const validationResult = buildUpdateRequestFromEditForm(appointment, editForm);
    if ('errorKey' in validationResult) {
      showErrorToast(validationResult.errorKey);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(appointment.id, validationResult.request.appointment);
      setIsEditing(false);
      setEditForm(buildEditForm(buildUpdatedAppointmentSnapshot(appointment, validationResult.request)));
    } catch {
      showErrorToast('scheduler.detail.updateError');
    } finally {
      setIsSaving(false);
    }
  }, [appointment, editForm, onUpdate, showErrorToast]);

  if (!appointment) {
    return null;
  }

  const isAssigned = currentMechanicId !== undefined &&
    appointment.mechanics.some((mechanic) => mechanic.id === currentMechanicId);
  const isInProgress = appointment.status === 'InProgress';
  const isClosedForMechanicMutations = !isInProgress;

  const showEdit = isAdmin || isAssigned;
  const canClaim = !isAdmin && !isAssigned && isInProgress;
  const canUnclaim = isAssigned && isInProgress && appointment.mechanics.length > 1;
  const canChangeStatus = isAdmin || isAssigned;

  const assignedMechanicIds = new Set(appointment.mechanics.map((mechanic) => mechanic.id));
  const availableMechanics = allMechanics.filter((mechanic) => !assignedMechanicIds.has(mechanic.personId));

  const formattedDate = formatLongDateTime(appointment.scheduledDate, i18n.language);
  const dueDateLabel = formatDueExactDateTime(appointment.dueDateTime, i18n.language);

  const dueState = getDueState(appointment.dueDateTime);

  const footer = (
    <AppointmentDetailFooter
      appointment={appointment}
      showEdit={showEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      canChangeStatus={canChangeStatus}
      isUpdating={isUpdating}
      t={t}
      onStartEdit={() => {
        setEditForm(buildEditForm(appointment));
        setIsEditing(true);
      }}
      onCancelEdit={() => {
        setEditForm(buildEditForm(appointment));
        setIsEditing(false);
      }}
      onSave={() => {
        void handleSave();
      }}
      onStatusChange={(status) => {
        setPendingStatusChange(status);
      }}
    />
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('scheduler.detail.title')}
        widthClassName="max-w-2xl"
        footer={footer}
      >
        <AppointmentDetailBody
          appointment={appointment}
          isAdmin={isAdmin}
          isEditing={isEditing}
          editForm={editForm}
          formattedDate={formattedDate}
          dueDateLabel={dueDateLabel}
          dueState={dueState}
          availableMechanics={availableMechanics}
          selectedNewMechanicId={selectedNewMechanicId}
          canClaim={canClaim}
          canUnclaim={canUnclaim}
          isClaiming={isClaiming}
          isAssigning={isAssigning}
          isClosedForMechanicMutations={isClosedForMechanicMutations}
          isUnclaiming={isUnclaiming}
          t={t}
          onEditField={handleEditField}
          onClaim={() => {
            if (canClaim) {
              void handleClaim();
            }
          }}
          onUnclaim={() => {
            if (canUnclaim) {
              setIsUnclaimConfirmOpen(true);
            }
          }}
          onSelectNewMechanic={setSelectedNewMechanicId}
          onAdminAssign={() => {
            void handleAdminAssign();
          }}
          onAdminUnassign={(mechanicId) => {
            void handleAdminUnassign(mechanicId);
          }}
          currentMechanicId={currentMechanicId}
        />
      </Modal>

      <AppointmentDetailConfirmModals
        pendingStatusChange={pendingStatusChange}
        isUpdating={isUpdating}
        onCloseStatusConfirm={() => {
          if (!isUpdating) {
            setPendingStatusChange(null);
          }
        }}
        onConfirmStatusChange={() => {
          void handleStatusChangeConfirmed();
        }}
        isUnclaimConfirmOpen={isUnclaimConfirmOpen}
        isUnclaiming={isUnclaiming}
        onCloseUnclaimConfirm={() => {
          if (!isUnclaiming) {
            setIsUnclaimConfirmOpen(false);
          }
        }}
        onConfirmUnclaim={() => {
          void handleUnclaimConfirmed();
        }}
      />
    </>
  );
});

AppointmentDetailModalComponent.displayName = 'AppointmentDetailModal';

export const AppointmentDetailModal = AppointmentDetailModalComponent;
