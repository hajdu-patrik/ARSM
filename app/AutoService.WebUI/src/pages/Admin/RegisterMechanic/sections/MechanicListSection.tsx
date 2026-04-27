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

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
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
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input p-5 shadow-[0_12px_28px_rgba(45,36,64,0.08)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_16px_32px_rgba(3,5,14,0.38)] sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-[linear-gradient(180deg,rgba(205,184,255,0.18)_0%,rgba(205,184,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(138,118,214,0.18)_0%,rgba(138,118,214,0)_100%)]" />
        {mechanics.length === 0 ? (
          <p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('admin.noMechanics')}</p>
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
                  className="relative flex items-start gap-3 rounded-xl border border-arsm-border bg-white px-4 py-3 shadow-[0_4px_12px_rgba(28,22,46,0.06)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_20px_rgba(28,22,46,0.1)] dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:shadow-[0_4px_12px_rgba(3,5,14,0.24)] dark:hover:shadow-[0_10px_20px_rgba(3,5,14,0.4)] sm:items-center"
                >
                  <MechanicAvatar
                    mechanicId={mechanic.personId}
                    fullName={displayName}
                    hasProfilePicture={Boolean(mechanic.hasProfilePicture)}
                    sizeClassName="h-10 w-10 text-sm"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-arsm-primary dark:text-arsm-primary-dark">
                        {displayName}
                      </p>
                      {mechanic.isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-arsm-accent/25 bg-arsm-accent-wash px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-arsm-accent-vivid dark:border-arsm-accent-dark/30 dark:bg-arsm-hover-dark dark:text-arsm-accent">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-arsm-label dark:text-arsm-label-dark">{mechanic.email}</p>
                  </div>

                  {canRemoveMechanic && (
                    <button
                      type="button"
                      onClick={() => openDeleteModal(mechanic)}
                      title={t('admin.deleteMechanic')}
                      className="ml-auto flex-shrink-0 rounded-lg p-2 text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-bg hover:shadow-[0_6px_14px_rgba(215,82,94,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/35 dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark dark:hover:shadow-[0_6px_14px_rgba(22,10,12,0.32)] dark:focus-visible:ring-arsm-error-dark/35"
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
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleDelete(); }}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(215,82,94,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active hover:shadow-[0_12px_26px_rgba(215,82,94,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {isDeleting ? t('admin.deleting') : t('admin.confirmDelete')}
            </button>
          </>
        )}
      >
        <p className="break-words text-sm text-arsm-label dark:text-arsm-label-dark [overflow-wrap:anywhere]">
          {t('admin.deleteMechanicWarning', {
            name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
            email: deleteTarget?.email ?? '',
          })}
        </p>
      </Modal>
    </>
  );
});
