/**
 * AppointmentDetailModal.tsx
 *
 * Auto-generated documentation header for this source file.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppointmentDto, AppointmentStatus, UpdateAppointmentRequest } from '../../../../types/scheduler/scheduler.types';
import { Modal } from '../../../../components/common/Modal';
import { useToastStore } from '../../../../store/toast.store';
import { getDueState } from '../../utils/due-date';
import { formatDueExactDateTime, formatLongDateTime } from '../../utils/scheduler-datetime';
import { useAdminMechanics } from '../../hooks/useAdminMechanics';
import { AppointmentDetailBody } from './AppointmentDetailModal.sections';
import { AppointmentDetailFooter } from './AppointmentDetailModal.footer';
import { AppointmentDetailRemoveMechanicModal } from './AppointmentDetailRemoveMechanicModal';
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
  readonly onUpdate: (id: number, request: UpdateAppointmentRequest) => Promise<void>;
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
  const [editErrorKey, setEditErrorKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const [removingMechanicId, setRemovingMechanicId] = useState<number | null>(null);
  const [pendingRemoveMechanic, setPendingRemoveMechanic] = useState<{ id: number; fullName: string } | null>(null);

  const initializedAppointmentIdRef = useRef<number | null>(null);
  const { allMechanics } = useAdminMechanics(isAdmin, isOpen);

  useEffect(() => {
    if (!isOpen || !appointment) {
      initializedAppointmentIdRef.current = null;
      setEditForm(null);
      setIsEditing(false);
      setEditErrorKey(null);
      setPendingRemoveMechanic(null);
      return;
    }

    if (initializedAppointmentIdRef.current === appointment.id) {
      return;
    }

    initializedAppointmentIdRef.current = appointment.id;
    setEditForm(buildEditForm(appointment));
    setIsEditing(false);
    setEditErrorKey(null);
    setPendingRemoveMechanic(null);
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

  const handleStatusChange = useCallback(async (status: AppointmentStatus) => {
    if (!appointment) {
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(appointment.id, status);
    } finally {
      setIsUpdating(false);
    }
  }, [appointment, onStatusChange]);

  const handleUnclaim = useCallback(async () => {
    if (!appointment) {
      return;
    }

    setIsUnclaiming(true);
    try {
      await onUnclaim(appointment.id);
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

  const handleAdminRemove = useCallback(async (mechanicId: number) => {
    if (!appointment) {
      return;
    }

    setRemovingMechanicId(mechanicId);
    try {
      await onAdminUnassign(appointment.id, mechanicId);
    } finally {
      setRemovingMechanicId(null);
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
      setEditErrorKey(validationResult.errorKey);
      return;
    }

    setIsSaving(true);
    setEditErrorKey(null);
    try {
      await onUpdate(appointment.id, validationResult.request);
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
  const isCancelled = appointment.status === 'Cancelled';
  const isClosedForMechanicMutations = appointment.status === 'Cancelled' || appointment.status === 'Completed';
  const canEdit = isAdmin || isAssigned;
  const canChangeStatus = isAssigned;

  const assignedMechanicIds = new Set(appointment.mechanics.map((mechanic) => mechanic.id));
  const availableMechanics = allMechanics.filter((mechanic) => !assignedMechanicIds.has(mechanic.personId));

  const formattedDate = formatLongDateTime(appointment.scheduledDate, i18n.language);
  const dueDateLabel = formatDueExactDateTime(appointment.dueDateTime, i18n.language);

  const dueState = getDueState(appointment.dueDateTime);
  const shouldShowClaimButton = !isAssigned && appointment.status === 'InProgress' && !dueState.isOverdue;

  const footer = (
    <AppointmentDetailFooter
      appointment={appointment}
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      isAssigned={isAssigned}
      canChangeStatus={canChangeStatus}
      isUpdating={isUpdating}
      shouldShowClaimButton={shouldShowClaimButton}
      isClaiming={isClaiming}
      t={t}
      onStartEdit={() => {
        setEditForm(buildEditForm(appointment));
        setIsEditing(true);
        setEditErrorKey(null);
      }}
      onCancelEdit={() => {
        setEditForm(buildEditForm(appointment));
        setIsEditing(false);
        setEditErrorKey(null);
      }}
      onSave={() => {
        void handleSave();
      }}
      onStatusChange={(status) => {
        void handleStatusChange(status);
      }}
      onClaim={() => {
        void handleClaim();
      }}
    />
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('scheduler.detail.title')}
        widthClassName="max-w-3xl"
        footer={footer}
      >
        <AppointmentDetailBody
          appointment={appointment}
          currentMechanicId={currentMechanicId}
          isAdmin={isAdmin}
          isEditing={isEditing}
          editForm={editForm}
          editErrorKey={editErrorKey}
          formattedDate={formattedDate}
          dueDateLabel={dueDateLabel}
          dueState={dueState}
          availableMechanics={availableMechanics}
          selectedNewMechanicId={selectedNewMechanicId}
          isAssigning={isAssigning}
          isClosedForMechanicMutations={isClosedForMechanicMutations}
          isUnclaiming={isUnclaiming}
          removingMechanicId={removingMechanicId}
          t={t}
          onEditField={handleEditField}
          onUnclaim={() => {
            void handleUnclaim();
          }}
          onQueueRemoveMechanic={setPendingRemoveMechanic}
          onSelectNewMechanic={setSelectedNewMechanicId}
          onAdminAssign={() => {
            void handleAdminAssign();
          }}
        />
      </Modal>

      <AppointmentDetailRemoveMechanicModal
        pendingRemoveMechanic={pendingRemoveMechanic}
        removingMechanicId={removingMechanicId}
        isCancelled={isCancelled}
        onClose={() => setPendingRemoveMechanic(null)}
        onConfirmRemove={handleAdminRemove}
      />
    </>
  );
});

AppointmentDetailModalComponent.displayName = 'AppointmentDetailModal';

export const AppointmentDetailModal = AppointmentDetailModalComponent;
