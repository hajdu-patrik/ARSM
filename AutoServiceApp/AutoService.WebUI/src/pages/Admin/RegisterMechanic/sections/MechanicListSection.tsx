import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { adminService } from '../../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../../services/profile/profile-picture-live.service';
import { useToastStore } from '../../../../store/toast.store';
import { Modal } from '../../../../components/common/Modal';
import type { MechanicListItem } from '../../../../services/admin/admin.service';
import { MechanicAvatar } from '../../../Scheduler/components/shared/MechanicAvatar';

interface MechanicListSectionProps {
  readonly refreshKey: number;
}

export const MechanicListSection = memo(function MechanicListSection({ refreshKey }: MechanicListSectionProps) {
  const { t } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [mechanics, setMechanics] = useState<MechanicListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MechanicListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMechanics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.listMechanics();
      setMechanics(data);
    } catch {
      showErrorToast('admin.mechanicListError');
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);

  useEffect(() => {
    void loadMechanics();
  }, [loadMechanics, refreshKey]);

  useEffect(() => {
    const handleProfilePictureUpdated = () => {
      void loadMechanics();
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    };
  }, [loadMechanics]);

  const openDeleteModal = useCallback((mechanic: MechanicListItem) => {
    setDeleteTarget(mechanic);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) return;
    setDeleteTarget(null);
  }, [isDeleting]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await adminService.deleteMechanic(deleteTarget.personId);
      setMechanics((prev) => prev.filter((m) => m.personId !== deleteTarget.personId));
      showSuccessToast('admin.mechanicDeleted', { email: deleteTarget.email });
      setDeleteTarget(null);
    } catch {
      showErrorToast('admin.mechanicDeleteFailed');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, showErrorToast, showSuccessToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#C9B3FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-5 dark:border-[#3A3154] dark:bg-[#13131B] sm:p-6">
        {mechanics.length === 0 ? (
          <p className="text-sm text-[#5E5672] dark:text-[#CFC5EA]">{t('admin.noMechanics')}</p>
        ) : (
          <div className="space-y-3">
            {mechanics.map((mechanic) => {
              const removableMechanicCount = mechanics.filter((item) => !item.isAdmin).length;
              const canRemoveMechanic = !mechanic.isAdmin && removableMechanicCount > 1;
              const displayName = [mechanic.lastName, mechanic.firstName, mechanic.middleName]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={mechanic.personId}
                  className="flex items-start gap-3 rounded-xl border border-[#D8D2E9] bg-white px-4 py-3 dark:border-[#3A3154] dark:bg-[#1A1A25] sm:items-center"
                >
                  <MechanicAvatar
                    mechanicId={mechanic.personId}
                    fullName={displayName}
                    hasProfilePicture={Boolean(mechanic.hasProfilePicture)}
                    sizeClassName="h-10 w-10 text-sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA]">
                        {displayName}
                      </p>
                      {mechanic.isAdmin && (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#5E5672] dark:text-[#CFC5EA]">{mechanic.email}</p>
                  </div>

                  {canRemoveMechanic && (
                    <button
                      type="button"
                      onClick={() => openDeleteModal(mechanic)}
                      title={t('admin.deleteMechanic')}
                      className="ml-auto flex-shrink-0 rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={closeDeleteModal}
        title={t('admin.deleteMechanicModalTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-xl border border-[#D8D2E9] bg-transparent px-4 py-2 text-sm font-medium text-[#5E5672] transition hover:bg-[#EFEBFA] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:text-[#CFC5EA] dark:hover:bg-[#241F33]"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleDelete(); }}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
            >
              {isDeleting ? t('admin.deleting') : t('admin.confirmDelete')}
            </button>
          </>
        )}
      >
        <p className="break-words text-sm text-[#5E5672] dark:text-[#CFC5EA] [overflow-wrap:anywhere]">
          {t('admin.deleteMechanicWarning', {
            name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
            email: deleteTarget?.email ?? '',
          })}
        </p>
      </Modal>
    </>
  );
});
